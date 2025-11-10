/**
 * NewsData.io Fetcher - Phase 1 MVP Integration
 * Fetches real articles from NewsData.io API
 * API Key loaded from NEWSDATA_API_KEY environment variable
 */

import axios, { AxiosInstance } from 'axios';

const NEWSDATA_API_BASE = 'https://newsdata.io/api/1/';

export interface Article {
  id: string;
  title: string;
  author: string;
  link: string;
  publishDate: string;
  description: string;
  source: string;
  content?: string;
  image?: string;
}

export interface NewsdataApiResponse {
  status: string;
  results?: NewsdataArticle[];
  next_page?: string;
  totalResults?: number;
}

interface NewsdataArticle {
  article_id: string;
  title: string;
  link: string;
  source_id: string;
  source_name: string;
  source_priority: number;
  source_url: string;
  source_icon: string;
  category: string[];
  language: string;
  country: string[];
  pubDate: string;
  content: string;
  image_url?: string;
  author?: string;
  ai_org?: string;
  ai_sentiment?: string;
  ai_tag?: string[];
}

interface FetcherOptions {
  limit?: number;
  retries?: number;
  sources?: string[]; // source domains like 'nytimes.com', 'foxnews.com'
}

class NewsdataFetcher {
  private apiKey: string;
  private client: AxiosInstance;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private rateLimitDelay: number = 100; // ms between requests

  constructor() {
    this.apiKey = process.env.NEWSDATA_API_KEY || '';
    this.client = axios.create({
      baseURL: NEWSDATA_API_BASE,
      timeout: 10000
    });
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Respect rate limiting
   */
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Fetch articles from NewsData.io API
   * Supports filtering by sources (domains)
   */
  async fetchArticles(terms: string[], options: FetcherOptions = {}): Promise<Article[]> {
    const { limit = 100, sources = [] } = options;

    if (!this.isConfigured()) {
      throw new Error('NEWSDATA_API_KEY not configured');
    }

    try {
      const searchQuery = terms.join(' OR ');
      await this.respectRateLimit();

      const params: any = {
        q: searchQuery,
        apikey: this.apiKey,
        language: 'en',
        country: 'us'
      };

      // Add source filtering if provided
      if (sources.length > 0) {
        params.domain = sources.join(',');
      }

      const response = await this.client.get<NewsdataApiResponse>('latest', { params });

      if (response.data.status !== 'success') {
        throw new Error(`NewsData API error: ${response.data.status}`);
      }

      const articles = response.data.results || [];
      this.requestCount++;

      // Return up to limit articles
      return articles.slice(0, limit).map((article: NewsdataArticle, index: number) => ({
        id: `newsdata_${article.article_id || index}`,
        title: article.title,
        author: article.author || article.source_name || 'Unknown',
        link: article.link,
        publishDate: article.pubDate,
        description: article.content || '',
        source: article.source_name,
        content: article.content,
        image: article.image_url
      }));
    } catch (error) {
      const axiosError = error as any;
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data;
        console.error(`NewsData API error (${status}):`, data);
        
        if (status === 429) {
          // Rate limited - return empty with warning
          console.warn('NewsData API rate limit hit');
          return [];
        }
        if (status === 401) {
          throw new Error('NewsData API key invalid or expired');
        }
        if (status === 422) {
          // Validation error - log and return empty
          console.error('NewsData API validation error:', data);
          return [];
        }
        throw new Error(`NewsData API fetch failed: ${status} - ${JSON.stringify(data)}`);
      }
      throw error;
    }
  }

  /**
   * Get statistics about requests made
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime
    };
  }

  /**
   * Reset stats
   */
  resetStats(): void {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  /**
   * Fetch available news sources from NewsData.io
   * Optionally filtered by country, category, or language
   */
  async fetchSources(params?: { country?: string; category?: string; language?: string }): Promise<any[]> {
    if (!this.isConfigured()) {
      throw new Error('NEWSDATA_API_KEY not configured');
    }

    try {
      await this.respectRateLimit();
      
      const queryParams: any = { apikey: this.apiKey };
      if (params?.country) queryParams.country = params.country;
      if (params?.category) queryParams.category = params.category;
      if (params?.language) queryParams.language = params.language;

      const response = await this.client.get('sources', { params: queryParams });

      if (response.data.status !== 'success') {
        throw new Error(`NewsData API error: ${response.data.status}`);
      }

      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching sources from NewsData:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const newsdataFetcher = new NewsdataFetcher();

/**
 * Legacy function for backward compatibility
 * Returns articles from NewsData.io, falling back to empty array if unavailable
 */
export async function getArticles(terms: string[] = [], limit: number = 100): Promise<Article[]> {
  try {
    if (!newsdataFetcher.isConfigured()) {
      console.warn('NewsData API key not configured, returning empty results');
      return [];
    }
    return await newsdataFetcher.fetchArticles(terms, { limit });
  } catch (error) {
    console.error('Failed to fetch articles from NewsData:', error);
    return [];
  }
}

/**
 * Fetch available news sources from NewsData.io
 * Returns articles from NewsData.io, falling back to empty array if unavailable
 */
export async function getSources(params?: { country?: string; category?: string; language?: string }): Promise<any[]> {
  try {
    if (!newsdataFetcher.isConfigured()) {
      console.warn('NewsData API key not configured, returning empty results');
      return [];
    }
    return await newsdataFetcher.fetchSources(params);
  } catch (error) {
    console.error('Failed to fetch sources from NewsData:', error);
    return [];
  }
}
