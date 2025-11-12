/**
 * Hybrid News Fetcher - Combines NewsData.io API and Google News Scraper
 * Provides fallback mechanism and dual-source enrichment
 */

import { newsdataFetcher, Article } from './newsdataFetcher.js';
import googleNewsScraper from 'google-news-scraper';

export interface HybridArticle extends Article {
  source_type?: 'newsdata' | 'google-news';
}

class HybridFetcher {
  private newsDataTimeout: number = 8000; // 8 seconds
  private googleNewsTimeout: number = 10000; // 10 seconds

  /**
   * Fetch articles from both sources with timeout handling
   * Always combines NewsData.io API and Google News for maximum coverage
   * Also searches for retractions and corrections related to the terms
   */
  async fetchArticles(
    terms: string[],
    options?: { limit?: number; retries?: number; sources?: string[] }
  ): Promise<HybridArticle[]> {
    const limit = options?.limit || 100;

    try {
      console.log(`Hybrid fetch: searching for "${terms.join(', ')}" (limit: ${limit})`);

      // Build search terms: original + "retraction + term" + "correction + term"
      const expandedTerms: string[][] = [
        terms, // Original search
        ...terms.map(term => ['retraction', term]), // retraction + each term
        ...terms.map(term => ['correction', term])  // correction + each term
      ];

      // Fetch from both sources in parallel for speed, for each term set
      const allResults = await Promise.all(
        expandedTerms.map(expandedTerm =>
          Promise.all([
            this.fetchFromNewsData(expandedTerm, options).catch((error) => {
              console.warn(`NewsData.io fetch failed for "${expandedTerm.join(' ')}"`, error);
              return [];
            }),
            this.fetchFromGoogleNews(expandedTerm, options).catch((error) => {
              console.warn(`Google News fetch failed for "${expandedTerm.join(' ')}"`, error);
              return [];
            })
          ])
        )
      );

      // Flatten the results
      const newsDataArticles = allResults.flatMap(([newsData]) => newsData);
      const googleNewsArticles = allResults.flatMap(([, googleNews]) => googleNews);

      console.log(`Hybrid fetch results: ${newsDataArticles.length} from NewsData.io, ${googleNewsArticles.length} from Google News`);

      // Mark each article with its source type
      const markedNewsData = newsDataArticles.map(a => ({
        ...a,
        source_type: 'newsdata' as const
      }));

      const markedGoogle = googleNewsArticles.map(a => ({
        ...a,
        source_type: 'google-news' as const
      }));

      // Combine articles from both sources
      const combined = [...markedNewsData, ...markedGoogle];

      // Deduplicate by title (case-insensitive) to avoid showing same story twice
      const deduped = Array.from(
        new Map(
          combined.map(a => [a.title.toLowerCase(), a])
        ).values()
      );

      console.log(`After deduplication: ${deduped.length} unique articles`);

      // Return up to the requested limit
      return deduped.slice(0, limit);
    } catch (error) {
      console.error('Hybrid fetch error:', error);
      return [];
    }
  }

  /**
   * Fetch from NewsData.io API
   */
  private async fetchFromNewsData(
    terms: string[],
    options?: { limit?: number; retries?: number; sources?: string[] }
  ): Promise<Article[]> {
    try {
      const articles = await newsdataFetcher.fetchArticles(terms, options);
      return articles;
    } catch (error) {
      console.error('NewsData fetch failed:', error);
      throw error;
    }
  }

  /**
   * Fetch from Google News Scraper with pagination support
   */
  private async fetchFromGoogleNews(
    terms: string[],
    options?: { limit?: number }
  ): Promise<Article[]> {
    try {
      const searchTerm = terms.join(' ');
      const limit = options?.limit || 1000;

      // Set Puppeteer args for headless environment
      const puppeteerArgs = ['--no-sandbox', '--disable-setuid-sandbox'];

      const allArticles: Article[] = [];
      const seenTitles = new Set<string>();

      // Make multiple requests to get more results
      // Google News typically returns ~40 results per request
      // We'll make multiple requests with different timeframes to maximize coverage over past 10 years
      const timeframes: Array<`${number}h` | `${number}d` | `${number}m` | `${number}y`> = ['3m', '6m', '1y', '2y', '3y', '5y', '10y'] as any;

      for (const timeframe of timeframes) {
        if (allArticles.length >= limit) break;

        try {
          console.log(`Fetching Google News for "${searchTerm}" with timeframe ${timeframe}...`);

          const googleArticles = await this.withTimeout(
            googleNewsScraper({
              searchTerm,
              limit: 40, // Each request gets ~40 results
              puppeteerArgs,
              puppeteerHeadlessMode: true,
              logLevel: 'error',
              timeframe,
              prettyURLs: true,
              getArticleContent: false,
              baseUrl: 'https://news.google.com/search'
            }),
            this.googleNewsTimeout
          );

          // Convert and deduplicate
          for (const article of googleArticles) {
            const titleLower = (article.title || '').toLowerCase();
            if (!seenTitles.has(titleLower) && allArticles.length < limit) {
              seenTitles.add(titleLower);
              allArticles.push({
                id: `google-news_${allArticles.length}_${Date.now()}`,
                title: article.title || '',
                author: 'Google News',
                link: article.link || '',
                publishDate: article.datetime || new Date().toISOString(),
                description: article.title || '',
                source: article.source || 'Google News',
                content: article.content || undefined,
                image: article.image || undefined
              });
            }
          }

          console.log(`Google News: got ${googleArticles.length} articles from timeframe ${timeframe}, total unique: ${allArticles.length}`);
        } catch (error) {
          console.warn(`Google News scrape failed for timeframe ${timeframe}:`, error);
          // Continue with next timeframe
          continue;
        }
      }

      console.log(`Google News total results: ${allArticles.length} unique articles`);
      return allArticles;
    } catch (error) {
      console.error('Google News scrape failed:', error);
      // Don't throw - just return empty array as fallback
      return [];
    }
  }

  /**
   * Add timeout wrapper to promises
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
}

export { HybridFetcher };
export const hybridFetcher = new HybridFetcher();

/**
 * Helper function to fetch articles from hybrid source
 */
export async function getHybridArticles(
  terms: string[] = [],
  limit: number = 100
): Promise<HybridArticle[]> {
  try {
    return await hybridFetcher.fetchArticles(terms, { limit });
  } catch (error) {
    console.error('Failed to fetch hybrid articles:', error);
    return [];
  }
}
