// @ts-nocheck
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';

const app = express();
app.use(cors());
app.use(express.json());

// Transient in-memory search cache (per process only) not persisted
interface SearchResult { id: string; terms: string[]; createdAt: string; status: 'processing' | 'complete'; }
const activeSearches: Record<string, SearchResult> = {};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, features: { storage: 'none' } });
});

app.get('/api/legend', (_req, res) => {
  res.json({
    statuses: {
      retraction: '#ef4444',
      correction: '#f59e0b',
      original: '#22c55e',
      inciting: '#137fec'
    }
  });
});

app.post('/api/search', (req, res) => {
  const { terms = [], limit = 40 } = req.body || {};
  const id = randomUUID();
  activeSearches[id] = { id, terms, createdAt: new Date().toISOString(), status: 'processing' };
  // For now immediately mark complete (placeholder pipeline)
  activeSearches[id].status = 'complete';
  res.status(202).json({ search_id: id, status: 'processing' });
});

app.get('/api/search/:id/results', (req, res) => {
  const sr = activeSearches[req.params.id];
  if (!sr) return res.status(404).json({ error: 'NOT_FOUND' });
  const geojson = { type: 'FeatureCollection', features: [] };
  res.json({ search_id: sr.id, ready: sr.status === 'complete', geojson, summary: { total: 0, retractions: 0, corrections: 0 } });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`server listening on :${port}`);
});
