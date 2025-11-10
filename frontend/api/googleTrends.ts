// Fetch and parse Google Trends data in the browser
// Usage: const data = await fetchGoogleTrends({ query, geo, dateRange })

export interface GoogleTrendsOptions {
  query: string;
  geo?: string;
  dateRange?: string; // e.g., 'now 1-d', '2023-01-01 2025-11-10'
  hl?: string;
}

export interface GoogleTrend {
  title: string;
  value: number;
  date: string;
}

export async function fetchGoogleTrends({ query, geo = 'US', dateRange = 'now 1-d', hl = 'en' }: GoogleTrendsOptions): Promise<GoogleTrend[]> {
  const url = `https://trends.google.com/trends/explore?q=${encodeURIComponent(query)}&date=${encodeURIComponent(dateRange)}&geo=${geo}&hl=${hl}`;
  const res = await fetch(url, {
    credentials: 'omit',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml',
      'User-Agent': navigator.userAgent,
      'Accept-Language': hl,
      // Google Trends blocks most bots, but browser fetch should work
    },
    mode: 'cors',
  });
  if (!res.ok) throw new Error(`Failed to fetch trends page: ${res.status}`);
  const html = await res.text();
  // Parse the embedded JSON from the trends page
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const scripts = Array.from(doc.querySelectorAll('script'));
  const dataScript = scripts.find(s => s.textContent && s.textContent.includes('var data ='));
  if (!dataScript) throw new Error('Could not find trends data script');
  const match = dataScript.textContent!.match(/var data = (\{.*?\});/s);
  if (!match) throw new Error('Could not extract trends JSON');
  let trendsData;
  try {
    trendsData = JSON.parse(match[1]);
  } catch (e) {
    throw new Error('Failed to parse trends JSON');
  }
  // Extract timeline data (may need to adjust path if Google changes structure)
  const timeline = trendsData?.widgets?.find((w: any) => w.id === 'TIMESERIES')?.request?.time || [];
  // Fallback: try to extract from timelineData
  const timelineData = trendsData?.widgets?.find((w: any) => w.id === 'TIMESERIES')?.data?.timelineData || [];
  if (!timelineData.length) throw new Error('No timeline data found');
  return timelineData.map((d: any) => ({
    title: query,
    value: Number(d.value?.[0] ?? 0),
    date: d.formattedTime || d.time,
  }));
}
