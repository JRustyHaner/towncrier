import puppeteer from 'puppeteer';

export async function fetchTrendsWithPuppeteer(query: string, geo = 'US', dateRange = 'now 7-d', hl = 'en') {
  const url = `https://trends.google.com/trends/explore?q=${encodeURIComponent(query)}&date=${encodeURIComponent(dateRange)}&geo=${geo}&hl=${hl}`;
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // Wait for the script tag with trends data
    await page.waitForFunction(() => {
      return Array.from(document.scripts).some(s => s.textContent && s.textContent.includes('var data ='));
    }, { timeout: 15000 });
    const dataJson = await page.evaluate(() => {
      const script = Array.from(document.scripts).find(s => s.textContent && s.textContent.includes('var data ='));
      if (!script) return null;
      const match = script.textContent.match(/var data = (\{.*?\});/s);
      if (!match) return null;
      return match[1];
    });
    if (!dataJson) throw new Error('Could not extract trends JSON');
    const trendsData = JSON.parse(dataJson);
    const timelineData = trendsData?.widgets?.find((w: any) => w.id === 'TIMESERIES')?.data?.timelineData || [];
    return timelineData.map((d: any) => ({
      title: query,
      value: Number(d.value?.[0] ?? 0),
      date: d.formattedTime || d.time,
    }));
  } finally {
    await browser.close();
  }
}
