/**
 * Google News Client-side Fetcher
 * Uses CORS proxy to fetch Google News RSS directly from the browser
 * RSS is more reliable than HTML scraping
 */

export interface GoogleNewsArticle {
  title: string;
  link: string;
  source: string;
  publishDate: string;
  description?: string;
  imageUrl?: string;
}

// CORS proxy URLs (use public, free CORS proxies)
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://thingproxy.freeboard.io/fetch/',
];



/**
 * Fetch Google News RSS feed and parse articles
 * Uses public CORS proxies which can reach Google News
 * @param searchTerms - Terms to search for
 * @param startIndex - Start index for pagination (0, 10, 20, etc.)
 * @param onProgress - Optional callback for progress updates with current term and article count
 */
export async function fetchGoogleNewsRSS(
  searchTerms: string[],
  startIndex: number = 0,
  onProgress?: (term: string, articleCount: number) => void
): Promise<GoogleNewsArticle[]> {
  const articles: GoogleNewsArticle[] = [];
  const seenTitles = new Set<string>();

  for (const searchTerm of searchTerms) {
    try {
      // Skip backend proxy - if server IP is blocked, backend can't fetch either
      // Go directly to public CORS proxies which can reach Google News
      const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerm)}&start=${startIndex}`;
      
      let success = false;

      // try the non-proxy first (may work in some environments)
        try {
            console.log(`[Google News RSS] Attempting direct fetch for: "${searchTerm}"`);
            const response = await fetch(feedUrl, {
                headers: {
                    'Accept': 'application/rss+xml, application/xml',
                    'Access-Control-Allow-Origin': '*'
                }
            });

            if (response.ok) {
                const text = await response.text();
                console.log(`[Google News RSS] Raw response (first 500 chars): ${text.substring(0, 500)}`);

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, 'text/xml');

                if (xmlDoc.documentElement.tagName === 'parsererror') {
                    const parseError = xmlDoc.documentElement.textContent;
                    console.warn(`[Google News RSS] XML parsing failed for "${searchTerm}" on direct fetch`);
                    console.warn(`[Google News RSS] Parse error: ${parseError}`);
                    console.warn(`[Google News RSS] Response preview: ${text.substring(0, 300)}`);
                } else {
                    console.log(`[Google News RSS] ✓ Successfully parsed RSS from direct fetch`);

                    const items = xmlDoc.querySelectorAll('item');
                    console.log(`[Google News RSS] Direct fetch returned ${items.length} items for "${searchTerm}"`);
                    
                    items.forEach((item) => {
                        try {
                            const title = item.querySelector('title')?.textContent || '';
                            if (!title || seenTitles.has(title.toLowerCase())) {
                                return;
                            }
                            seenTitles.add(title.toLowerCase());
                            
                            const link = item.querySelector('link')?.textContent || '';
                            const source = item.querySelector('source')?.textContent || 'Google News';
                            const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
                            const description = item.querySelector('description')?.textContent || '';
                            if (title && link) {
                                articles.push({
                                    title,
                                    link,
                                    source,
                                    publishDate: pubDate,
                                    description
                                });
                                // Call progress callback after each article is added
                                if (onProgress) {
                                    onProgress(searchTerm, articles.length);
                                }
                            }
                        }
                        catch (e) {
                            console.warn('[Google News RSS] Error parsing item:', e);
                        }
                    });
                    
                    console.log(`[Google News RSS] ✓ Got ${items.length} items from direct fetch for "${searchTerm}"`);
                    success = true;
                }
            }
        } catch (error) {
            console.error(`[Google News RSS] Direct fetch FAILED for "${searchTerm}":`, error);
        }
        
      if (success) {
        continue; // Skip proxies if direct fetch succeeded
      }
      for (const corsProxy of CORS_PROXIES) {
        try {
          const proxiedUrl = corsProxy + encodeURIComponent(feedUrl);
          console.log(`[Google News RSS] Attempting CORS proxy for: "${searchTerm}" at ${corsProxy}`);
          
          let response;
          try {
            response = await fetch(proxiedUrl, {
              headers: {
                'Accept': 'application/rss+xml, application/xml'
              }
            });
          } catch (fetchError) {
            console.error(`[Google News RSS] CORS FETCH FAILED for "${searchTerm}" on ${corsProxy}:`, fetchError);
            continue; // CORS or network failure - try next proxy
          }
          
          if (!response.ok) {
            console.warn(`[Google News RSS] HTTP ${response.status} from ${corsProxy} for "${searchTerm}"`);
            continue;
          }

          const text = await response.text();
          console.log(`[Google News RSS] Raw response (first 500 chars): ${text.substring(0, 500)}`);
          
          // Check if response looks like HTML error page (starts with <!DOCTYPE or <html)
          if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
            console.warn(`[Google News RSS] CORS proxy returned HTML error page for "${searchTerm}" from ${corsProxy}`);
            console.warn(`[Google News RSS] HTML response: ${text.substring(0, 200)}`);
            continue;
          }
          
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');
          
          if (xmlDoc.documentElement.tagName === 'parsererror') {
            const parseError = xmlDoc.documentElement.textContent;
            console.warn(`[Google News RSS] XML parsing failed for "${searchTerm}" on ${corsProxy}`);
            console.warn(`[Google News RSS] Parse error: ${parseError}`);
            console.warn(`[Google News RSS] Response preview: ${text.substring(0, 300)}`);
            continue;
          }
          
          console.log(`[Google News RSS] ✓ Successfully parsed RSS from ${corsProxy}`);

          const items = xmlDoc.querySelectorAll('item');
          console.log(`[Google News RSS] CORS proxy returned ${items.length} items for "${searchTerm}"`);
          
          items.forEach((item) => {
            try {
              const title = item.querySelector('title')?.textContent || '';
              
              if (!title || seenTitles.has(title.toLowerCase())) {
                return;
              }
              seenTitles.add(title.toLowerCase());

              const link = item.querySelector('link')?.textContent || '';
              const source = item.querySelector('source')?.textContent || 'Google News';
              const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
              const description = item.querySelector('description')?.textContent || '';

              if (title && link) {
                articles.push({
                  title,
                  link,
                  source,
                  publishDate: pubDate,
                  description
                });
                // Call progress callback after each article is added
                if (onProgress) {
                  onProgress(searchTerm, articles.length);
                }
              }
            } catch (e) {
              console.warn('[Google News RSS] Error parsing item:', e);
            }
          });
          
          console.log(`[Google News RSS] ✓ Got ${items.length} items from ${corsProxy} for "${searchTerm}"`);
          success = true;
          break; // Stop trying other proxies if this one worked
        } catch (error) {
          console.error(`[Google News RSS] Unexpected error with ${corsProxy}:`, error);
          continue;
        }
      }
      
      if (!success) {
        console.warn(`[Google News RSS] All proxies failed for "${searchTerm}"`);
      }
    } catch (error) {
      console.warn(`[Google News RSS] Error fetching for "${searchTerm}":`, error);
    }
  }

  console.log(`[Google News RSS] Total articles fetched: ${articles.length}`);
  return articles;
}

/**
 * Fetch multiple pages of Google News results
 * @param searchTerms - Terms to search for
 * @param numPages - Number of pages to fetch (each page ~10 articles)
 */
export async function fetchGoogleNewsPaginated(
  searchTerms: string[],
  numPages: number = 5,
  onProgress?: (term: string, articleCount: number) => void
): Promise<GoogleNewsArticle[]> {
  const allArticles: GoogleNewsArticle[] = [];
  const seenTitles = new Set<string>();

  for (let pageNum = 0; pageNum < numPages; pageNum++) {
    const startIndex = pageNum * 10; // Google News returns ~10 articles per page
    
    try {
      console.log(`[Google News Paginated] Fetching page ${pageNum + 1} (start=${startIndex})`);
      const articles = await fetchGoogleNewsRSS(searchTerms, startIndex, onProgress);
      
      if (articles.length === 0) {
        console.log(`[Google News Paginated] No more articles available at page ${pageNum + 1}`);
        break;
      }

      // Add articles if not seen before
      for (const article of articles) {
        const titleLower = article.title.toLowerCase();
        if (!seenTitles.has(titleLower)) {
          seenTitles.add(titleLower);
          allArticles.push(article);
        }
      }
      
      // Delay between page fetches to avoid rate limiting
      if (pageNum < numPages - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.warn(`[Google News Paginated] Error fetching page ${pageNum + 1}:`, error);
      break;
    }
  }

  console.log(`[Google News Paginated] Total unique articles from ${numPages} pages: ${allArticles.length}`);
  return allArticles;
}

/**
 * Fetch Google News with multiple search variations for better coverage
 * Includes searches for retractions, corrections, etc.
 * Now with pagination support for more results per search term
 */
export async function fetchGoogleNewsBacklog(
  searchTerms: string[],
  limit: number = 500,
  pagesPerTerm: number = 3,
  onProgress?: (term: string, articleCount: number) => void
): Promise<GoogleNewsArticle[]> {
  const allArticles: GoogleNewsArticle[] = [];
  const seenTitles = new Set<string>();
  
  // Expand search terms to include retractions and corrections
  const expandedTerms: string[] = [];
  for (const term of searchTerms) {
    expandedTerms.push(term);
    expandedTerms.push(`${term} retraction`);
    expandedTerms.push(`${term} correction`);
  }

  for (const searchTerm of expandedTerms) {
    if (allArticles.length >= limit) {
      console.log(`[Google News Backlog] Reached article limit (${limit})`);
      break;
    }

    try {
      console.log(`[Google News Backlog] Fetching: "${searchTerm}" (${pagesPerTerm} pages)`);
      const articles = await fetchGoogleNewsPaginated([searchTerm], pagesPerTerm, onProgress);
      
      // Add articles if not seen before
      for (const article of articles) {
        const titleLower = article.title.toLowerCase();
        if (!seenTitles.has(titleLower) && allArticles.length < limit) {
          seenTitles.add(titleLower);
          allArticles.push(article);
          // Call progress callback
          if (onProgress) {
            onProgress(searchTerm, allArticles.length);
          }
        }
      }
      
      // Delay between search terms to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.warn(`[Google News Backlog] Error fetching "${searchTerm}":`, error);
      continue;
    }
  }
  
  console.log(`[Google News Backlog] Total unique articles fetched: ${allArticles.length}`);
  return allArticles;
}
