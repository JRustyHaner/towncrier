
// Support both ESM and CJS for node-fetch
import fetchType, { RequestInit, Response } from 'node-fetch';
import * as cheerio from 'cheerio';
// node-fetch ESM/CJS compatibility
const fetch: typeof fetchType = (fetchType as any).default ? (fetchType as any).default : fetchType;

/**
 * Fetches and parses Google Trends data from the public trends.google.com web page.
 * @param {string} keyword - The search term to query.
 * @param {string} [dateRange] - The date range (e.g., 'now 1-d').
 * @param {string} [geo] - The region code (e.g., 'US').
 * @param {string} [hl] - The language code (e.g., 'en').
 * @returns {Promise<any>} Parsed trends data or null if not found.
 */
export async function fetchTrendsFromHtml({
  keyword,
  dateRange = 'now 1-d',
  geo = 'US',
  hl = 'en'
}: {
  keyword: string;
  dateRange?: string;
  geo?: string;
  hl?: string;
}): Promise<any> {
  const url = `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}&date=${encodeURIComponent(dateRange)}&geo=${geo}&hl=${hl}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://trends.google.com/trends/',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'DNT': '1',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Connection': 'keep-alive'
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch trends page: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  // Look for the embedded JSON data in a <script> tag
  // Find the script tag containing 'var _trends'
  const scriptTag = $('script').filter((i, el) => {
    const html = $(el).html();
    return typeof html === 'string' && html.includes('var _trends');
  }).first();
  const scriptContent = scriptTag.html();
  if (!scriptContent) throw new Error('Could not find trends data script tag.');

  // Extract the JSON from the script content
  const match = scriptContent.match(/var _trends = (.*?);\n/);
  if (!match) throw new Error('Could not extract trends JSON.');
  let trendsJson;
  try {
    trendsJson = JSON.parse(match[1]);
  } catch (e) {
    throw new Error('Failed to parse trends JSON.');
  }
  return trendsJson;
}
