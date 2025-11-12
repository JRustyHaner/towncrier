import { Router } from 'express';
import { fetchTrendsWithPuppeteer } from './googleTrendsPuppeteer.js';

const router = Router();

// GET /api/trends/puppeteer?query=...&geo=...&dateRange=...&hl=...
router.get('/puppeteer', async (req, res) => {
  const query = req.query.query as string;
  const geo = (req.query.geo as string) || 'US';
  const dateRange = (req.query.dateRange as string) || 'now 7-d';
  const hl = (req.query.hl as string) || 'en';
  if (!query) return res.status(400).json({ error: 'Missing query' });
  try {
    const data = await fetchTrendsWithPuppeteer(query, geo, dateRange, hl);
    res.json({ query, geo, dateRange, hl, data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
