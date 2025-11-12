import express from 'express';
import { fetchDataForSeoSERP } from './dataForSeoClient.js';

const router = express.Router();

// Expects ?q=search+term
router.get('/dataforseo', async (req, res) => {
  const query = req.query.q as string;
  const apiKey = process.env.DATAFORSEO_API_KEY;
  const apiSecret = process.env.DATAFORSEO_API_SECRET;

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }
  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Missing DataForSEO API credentials' });
  }

  try {
    const data = await fetchDataForSeoSERP(query, apiKey, apiSecret);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch from DataForSEO' });
  }
});

export default router;
