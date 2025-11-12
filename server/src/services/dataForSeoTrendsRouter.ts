import express from 'express';
import { fetchDataForSeoTrends } from './dataForSeoTrendsClient.js';

const router = express.Router();

// POST /api/trends/dataforseo
router.post('/dataforseo', async (req, res) => {
  const { keywords, date_from, date_to, type, category_code, location_name } = req.body || {};
  const apiKey = process.env.DATAFORSEO_API_KEY;
  const apiSecret = process.env.DATAFORSEO_API_SECRET;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid keywords array' });
  }
  if (!date_from || !date_to) {
    return res.status(400).json({ error: 'Missing date_from or date_to' });
  }
  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Missing DataForSEO API credentials' });
  }

  try {
    const data = await fetchDataForSeoTrends({
      keywords,
      date_from,
      date_to,
      type: type || 'web',
      category_code: category_code || 0,
      location_name: location_name || 'United States',
      apiKey,
      apiSecret
    });
    res.json(data);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message || 'Failed to fetch Google Trends from DataForSEO' });
  }
});

export default router;
