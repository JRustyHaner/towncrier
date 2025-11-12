import express from 'express';
import { getStateTrendPolygons } from './stateTrendPolygons.js';
import { fetchDataForSeoTrends } from './dataForSeoTrendsClient.js';

const router = express.Router();

// GET /api/trends/timeseries?keyword=...&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
// Returns US-wide trend time-series data
router.get('/timeseries', async (req, res) => {
  const keyword = req.query.keyword as string;
  const date_from = req.query.date_from as string;
  const date_to = req.query.date_to as string;
  const apiKey = process.env.DATAFORSEO_API_KEY;
  const apiSecret = process.env.DATAFORSEO_API_SECRET;

  if (!keyword) {
    return res.status(400).json({ error: 'Missing keyword' });
  }
  if (!date_from || !date_to) {
    return res.status(400).json({ error: 'Missing date_from or date_to' });
  }
  
  // If API credentials are missing, return empty data gracefully
  if (!apiKey || !apiSecret) {
    console.warn('[TrendTimeSeries] DataForSEO API credentials not configured, returning empty trends');
    return res.json({
      timeSeries: [],
      itemCount: 0,
      warning: 'API credentials not configured'
    });
  }
  const startTime = new Date();
  console.log(`[TrendTimeSeries] Start: ${startTime.toISOString()}`);
  try {
    const trendsResult = await fetchDataForSeoTrends({
      keywords: [keyword],
      date_from,
      date_to,
      type: 'news',
      category_code: 0,
      location_name: 'United States',
      apiKey,
      apiSecret
    });

    // Extract time-series data from items[0].data[]
    const items = trendsResult?.tasks?.[0]?.result?.[0]?.items || [];
    let timeSeriesData: Array<{ date: string; value: number }> = [];
    if (items.length > 0 && items[0].data) {
      timeSeriesData = items[0].data.map((point: any) => ({
        date: point.date_from,
        value: point.values?.[0] || 0
      }));
    }

    const finishTime = new Date();
    console.log(`[TrendTimeSeries] Finish: ${finishTime.toISOString()}`);
    res.json({
      start: startTime.toISOString(),
      finish: finishTime.toISOString(),
      timeSeries: timeSeriesData,
      itemCount: timeSeriesData.length
    });
  } catch (err) {
    const error = err as Error;
    const finishTime = new Date();
    console.error(`[TrendTimeSeries] Error at: ${finishTime.toISOString()} - ${error.message}`);
    console.error(`[TrendTimeSeries] Stack: ${error.stack}`);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch trend time-series', 
      start: startTime.toISOString(), 
      finish: finishTime.toISOString() 
    });
  }
});

// Keep old endpoint for backwards compatibility but just return timeseries now
// GET /api/trends/state-polygons?keyword=...&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
import { writeJsonWithTimestamp } from './writeJsonWithTimestamp.js';

router.get('/state-polygons', async (req, res) => {
  const keyword = req.query.keyword as string;
  const date_from = req.query.date_from as string;
  const date_to = req.query.date_to as string;
  const write_json = req.query.write_json === 'true';
  const apiKey = process.env.DATAFORSEO_API_KEY;
  const apiSecret = process.env.DATAFORSEO_API_SECRET;

  if (!keyword) {
    return res.status(400).json({ error: 'Missing keyword' });
  }
  if (!date_from || !date_to) {
    return res.status(400).json({ error: 'Missing date_from or date_to' });
  }
  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Missing DataForSEO API credentials' });
  }

  const startTime = new Date();
  console.log(`[StatePolygons] Start: ${startTime.toISOString()}`);
  try {
    const geojson = await getStateTrendPolygons({
      keyword,
      date_from,
      date_to,
      apiKey,
      apiSecret
    });
    let jsonPath = null;
    if (write_json) {
      jsonPath = await writeJsonWithTimestamp(geojson, 'state-polygons');
      console.log(`[StatePolygons] Output written to: ${jsonPath}`);
    }
    const finishTime = new Date();
    console.log(`[StatePolygons] Finish: ${finishTime.toISOString()}`);
    res.json({
      ...(write_json ? { jsonPath } : {}),
      start: startTime.toISOString(),
      finish: finishTime.toISOString(),
      geojson
    });
  } catch (err) {
    const error = err as Error;
    const finishTime = new Date();
    console.log(`[StatePolygons] Error at: ${finishTime.toISOString()}`);
    res.status(500).json({ error: error.message || 'Failed to fetch state trend polygons', start: startTime.toISOString(), finish: finishTime.toISOString() });
  }
});

export default router;
