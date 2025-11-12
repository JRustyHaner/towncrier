
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { fetchDataForSeoTrends } from './dataForSeoTrendsClient.js';

/**
 * Loads the US states GeoJSON file from the frontend/data directory.
 */
export async function loadUsStatesGeoJson() {
  // ESM-compatible __dirname
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const geojsonPath = path.resolve(__dirname, '../../../frontend/data/us-states.geojson');
  // Download if missing
  try {
    await fs.access(geojsonPath);
  } catch {
    console.log('[GeoJSON] us-states.geojson not found, downloading...');
    const url = 'https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_500k.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to download us-states.geojson');
    const geojson = await res.text();
    await fs.mkdir(path.dirname(geojsonPath), { recursive: true });
    await fs.writeFile(geojsonPath, geojson, 'utf-8');
    console.log('[GeoJSON] us-states.geojson downloaded.');
  }
  const data = await fs.readFile(geojsonPath, 'utf-8');
  return JSON.parse(data);
}

/**
 * Fetches per-state Google Trends data for a keyword and returns annotated state polygons.
 * @param keyword The search term
 * @param date_from Start date (YYYY-MM-DD)
 * @param date_to End date (YYYY-MM-DD)
 * @param apiKey DataForSEO API key
 * @param apiSecret DataForSEO API secret
 */
export async function getStateTrendPolygons({
  keyword,
  date_from,
  date_to,
  apiKey,
  apiSecret
}: {
  keyword: string;
  date_from: string;
  date_to: string;
  apiKey: string;
  apiSecret: string;
}) {
  // Load US states GeoJSON
  const geojson = await loadUsStatesGeoJson();

  // Fetch DataForSEO trends for all US states
  const location_name = 'United States';
  const type = 'news';
  const category_code = 0;
  const trendsResult = await fetchDataForSeoTrends({
    keywords: [keyword],
    date_from,
    date_to,
    type,
    category_code,
    location_name,
    apiKey,
    apiSecret
  });

  // DataForSEO returns region data in tasks[0].result[0].geo_interest
  const geoInterest =
    trendsResult?.tasks?.[0]?.result?.[0]?.geo_interest || [];

  // Extract time-series data from items[0].data[]
  const items = trendsResult?.tasks?.[0]?.result?.[0]?.items || [];
  let timeSeriesData: Array<{ date: string; value: number }> = [];
  if (items.length > 0 && items[0].data) {
    timeSeriesData = items[0].data.map((point: any) => ({
      date: point.date_from, // Use date_from for consistent labeling
      value: point.values?.[0] || 0
    }));
  }

  // Map state name to trend info
  const stateTrends: Record<string, { value: number; last_trending_date: string | null }> = {};
  for (const region of geoInterest) {
    // region.region_name is the state name, region.value is intensity, region.last_trending_date
    stateTrends[region.region_name] = {
      value: region.value,
      last_trending_date: region.last_trending_date || null
    };
  }

  // Annotate each state polygon with trend info
  geojson.features.forEach((feature: any) => {
    const stateName = feature.properties.NAME;
    const trend = stateTrends[stateName] || { value: 0, last_trending_date: null };
    feature.properties.trend_value = trend.value;
    feature.properties.last_trending_date = trend.last_trending_date;
  });

  return {
    ...geojson,
    timeSeries: timeSeriesData // Add time-series data for graph
  };
}
