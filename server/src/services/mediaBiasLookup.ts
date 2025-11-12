/**
 * Media Bias Lookup Service
 * Reads media bias and factual reporting ratings from local CSV file
 * File location: server/data/media-bias.csv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface MediaBiasRating {
  siteName: string;
  url: string;
  biasRating: number; // -30 (liberal/left) to +30 (conservative/right)
  factualReportingRating: 'MIXED' | 'HIGH' | 'VERY_HIGH';
}

interface BiasCache {
  [domain: string]: MediaBiasRating;
}

interface BiasNameCache {
  [siteName: string]: MediaBiasRating;
}

class MediaBiasLookup {
  private cache: BiasCache = {};
  private nameCache: BiasNameCache = {}; // Lookup by source name (for Google News)
  private csvPath = this.getDataPath('media-bias.csv');
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Get the path to a data file
   */
  private getDataPath(filename: string): string {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    return path.join(__dirname, '../../data', filename);
  }

  /**
   * Initialize the cache by reading and parsing the local CSV file
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Read CSV file from local disk
        if (!fs.existsSync(this.csvPath)) {
          console.warn(`Media bias CSV not found at ${this.csvPath}`);
          this.initialized = true;
          return;
        }

        const fileContent = fs.readFileSync(this.csvPath, 'utf-8');
        const lines = fileContent.split('\n');
        
        // Parse CSV (skip header)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Parse CSV line (handle quoted fields)
          const fields = this.parseCsvLine(line);
          if (fields.length < 4) continue;

          const [siteName, url, biasRatingStr, factualReporting] = fields;
          
          try {
            const biasRating = parseInt(biasRatingStr, 10);
            const domain = this.extractDomain(url);

            if (domain) {
              const rating: MediaBiasRating = {
                siteName: siteName.trim(),
                url: url.trim(),
                biasRating: isNaN(biasRating) ? 0 : biasRating,
                factualReportingRating: this.normalizeFactualReporting(factualReporting)
              };
              
              // Store by domain
              this.cache[domain] = rating;
              
              // Also store by normalized site name (lowercase, spaces to hyphens)
              const normalizedName = siteName.trim().toLowerCase().replace(/\s+/g, '-');
              this.nameCache[normalizedName] = rating;
              
              // Also try to match partial names (e.g., "BBC News" -> "bbc")
              const shortName = siteName.trim().split(/\s+/)[0].toLowerCase();
              if (shortName && shortName.length > 2) {
                this.nameCache[shortName] = rating;
              }
            }
          } catch (e) {
            // Skip malformed rows
            continue;
          }
        }

        this.initialized = true;
        console.log(`✓ Loaded media bias data for ${Object.keys(this.cache).length} sources from local CSV`);
      } catch (error) {
        console.error('Failed to load media bias CSV:', error);
        this.initialized = true; // Mark as initialized even on failure
      }
    })();

    return this.initPromise;
  }

  /**
   * Parse a CSV line handling quoted fields (comma-delimited)
   */
  private parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quotes
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Comma-delimited (standard CSV)
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    fields.push(current);
    return fields.map(f => f.replace(/^"|"$/g, '')); // Remove surrounding quotes
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
      return urlObj.hostname.toLowerCase().replace('www.', '');
    } catch (e) {
      return null;
    }
  }

  /**
   * Normalize factual reporting rating
   */
  private normalizeFactualReporting(rating: string): 'MIXED' | 'HIGH' | 'VERY_HIGH' {
    const normalized = rating.trim().toUpperCase();
    if (normalized.includes('VERY')) return 'VERY_HIGH';
    if (normalized.includes('HIGH')) return 'HIGH';
    return 'MIXED';
  }

  /**
   * Look up bias rating for a source domain OR by source name
   */
  async lookupSource(sourceUrl: string, sourceName?: string): Promise<MediaBiasRating | null> {
    await this.initialize();

    // First, try to look up by source name if provided (works great for Google News)
    if (sourceName) {
      const normalizedName = sourceName.trim().toLowerCase().replace(/\s+/g, '-');
      if (this.nameCache[normalizedName]) {
        const result = this.nameCache[normalizedName];
        console.log(`✓ Media Bias Lookup - Source: "${result.siteName}" | Bias: ${result.biasRating} | Factual Reporting: ${result.factualReportingRating}`);
        return result;
      }
      
      // Try short name
      const shortName = sourceName.trim().split(/\s+/)[0].toLowerCase();
      if (shortName && this.nameCache[shortName]) {
        const result = this.nameCache[shortName];
        console.log(`✓ Media Bias Lookup - Source: "${result.siteName}" | Bias: ${result.biasRating} | Factual Reporting: ${result.factualReportingRating}`);
        return result;
      }
      
      // Try fuzzy match on name
      for (const cachedName of Object.keys(this.nameCache)) {
        if (normalizedName.includes(cachedName) || cachedName.includes(normalizedName)) {
          const result = this.nameCache[cachedName];
          console.log(`✓ Media Bias Lookup - Source: "${result.siteName}" | Bias: ${result.biasRating} | Factual Reporting: ${result.factualReportingRating}`);
          return result;
        }
      }
    }

    const domain = this.extractDomain(sourceUrl);
    if (!domain) return null;

    // Try exact domain match
    if (this.cache[domain]) {
      const result = this.cache[domain];
      console.log(`✓ Media Bias Lookup - Source: "${result.siteName}" | Bias: ${result.biasRating} | Factual Reporting: ${result.factualReportingRating}`);
      return result;
    }

    // Try partial domain matches (e.g., 'bbc' from 'bbc.co.uk')
    for (const cachedDomain of Object.keys(this.cache)) {
      if (domain.includes(cachedDomain) || cachedDomain.includes(domain)) {
        const result = this.cache[cachedDomain];
        console.log(`✓ Media Bias Lookup - Source: "${result.siteName}" | Bias: ${result.biasRating} | Factual Reporting: ${result.factualReportingRating}`);
        return result;
      }
    }

    return null;
  }

  /**
   * Get multiple sources at once
   */
  async lookupSources(sourceUrls: string[]): Promise<Map<string, MediaBiasRating | null>> {
    await this.initialize();
    
    const results = new Map<string, MediaBiasRating | null>();
    for (const url of sourceUrls) {
      results.set(url, await this.lookupSource(url));
    }
    return results;
  }

  /**
   * Clear the cache and force reload
   */
  clearCache(): void {
    this.cache = {};
    this.nameCache = {};
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Get cache statistics
   */
  getStats(): { cachedSources: number; initialized: boolean } {
    return {
      cachedSources: Object.keys(this.cache).length,
      initialized: this.initialized
    };
  }
}

export const mediaBiasLookup = new MediaBiasLookup();
