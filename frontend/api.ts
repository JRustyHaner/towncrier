/**
 * API Client for backend communication
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export interface Article {
  id: string;
  title: string;
  author: string;
  source: string;
  publishDate: string;
  link: string;
  description: string;
  status: string;
  city: string;
  confidence: number;
  sentiment?: { score: number; comparative: number };
  sentimentLabel?: string;
  trendValue?: number;
  valence?: number; // -1 to 1 for sentiment valence (red to grey to blue)
  category?: 'retraction' | 'original' | 'correction' | 'disputed' | 'misleading';
  bias?: number; // -30 to 30 from media bias CSV
  factualReporting?: 'MIXED' | 'HIGH' | 'VERY_HIGH';
  firstArticleTime?: number;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Article;
}

export interface GeoJSONResponse {
  search_id: string;
  ready: boolean;
  geojson: { type: 'FeatureCollection'; features: GeoJSONFeature[] };
  summary: { total: number; retractions: number; corrections: number; originals: number; inciting: number };
}

export interface Legend {
  statuses: Record<string, { color: string; shape: string; label: string }>;
}

export async function health() {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  return res.json();
}

export async function getLegend(): Promise<Legend> {
  const res = await fetch(`${API_BASE_URL}/api/legend`);
  return res.json();
}

export async function search(terms: string[], limit: number = 1000): Promise<{ search_id: string; status: string }> {
  const res = await fetch(`${API_BASE_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terms, limit })
  });
  return res.json();
}

export async function getSearchResults(searchId: string): Promise<GeoJSONResponse> {
  const res = await fetch(`${API_BASE_URL}/api/search/${searchId}/results`);
  return res.json();
}
