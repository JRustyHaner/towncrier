// @ts-nocheck
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { getMockArticles } from './services/rssFetcher.js';
import { extractCity } from './services/cityExtractor.js';
import { classifyStatus } from './services/statusClassifier.js';

const app = express();
app.use(cors());
app.use(express.json());

// Transient in-memory search cache (per process only) not persisted
interface SearchResult {
  id: string;
  terms: string[];
  createdAt: string;
  status: 'processing' | 'complete';
  geojson?: GeoJSON.FeatureCollection;
  summary?: { total: number; retractions: number; corrections: number; originals: number; inciting: number };
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
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
  };
}

interface GeoJSON {
  FeatureCollection: {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
  };
}

const activeSearches: Record<string, SearchResult> = {};
const colorMap: Record<string, string> = {
  retraction: '#ef4444',
  correction: '#f59e0b',
  original: '#22c55e',
  inciting: '#137fec'
};
const shapeMap: Record<string, string> = {
  retraction: 'circle',
  correction: 'square',
  original: 'triangle',
  inciting: 'ring'
};

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, features: { storage: 'none', stateless: true } });
});

// Legend endpoint
app.get('/api/legend', (_req, res) => {
  res.json({
    statuses: {
      retraction: { color: colorMap.retraction, shape: shapeMap.retraction, label: 'Retraction' },
      correction: { color: colorMap.correction, shape: shapeMap.correction, label: 'Correction' },
      original: { color: colorMap.original, shape: shapeMap.original, label: 'Original' },
      inciting: { color: colorMap.inciting, shape: shapeMap.inciting, label: 'Inciting' }
    }
  });
});

// Search endpoint (POST)
app.post('/api/search', (req, res) => {
  const { terms = [], limit = 40 } = req.body || {};
  const id = randomUUID();

  // Build GeoJSON from mock articles
  const articles = getMockArticles();
  const features: GeoJSONFeature[] = [];
  const summaryStats = { total: 0, retractions: 0, corrections: 0, originals: 0, inciting: 0 };

  articles.slice(0, limit).forEach((article, index) => {
    const city = extractCity(`${article.title} ${article.description}`, index);
    const statusClassification = classifyStatus(`${article.title} ${article.description}`);

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [city.longitude, city.latitude]
      },
      properties: {
        id: article.id,
        title: article.title,
        author: article.author,
        source: article.source,
        publishDate: article.publishDate,
        link: article.link,
        description: article.description,
        status: statusClassification.status,
        city: city.name,
        confidence: city.confidence
      }
    });

    summaryStats.total++;
    if (statusClassification.status === 'retraction') summaryStats.retractions++;
    else if (statusClassification.status === 'correction') summaryStats.corrections++;
    else if (statusClassification.status === 'original') summaryStats.originals++;
    else if (statusClassification.status === 'inciting') summaryStats.inciting++;
  });

  const geojson = {
    type: 'FeatureCollection',
    features
  };

  activeSearches[id] = {
    id,
    terms,
    createdAt: new Date().toISOString(),
    status: 'complete',
    geojson,
    summary: summaryStats
  };

  res.status(202).json({ search_id: id, status: 'complete' });
});

// Get search results endpoint
app.get('/api/search/:id/results', (req, res) => {
  const sr = activeSearches[req.params.id];
  if (!sr) return res.status(404).json({ error: 'NOT_FOUND' });

  res.json({
    search_id: sr.id,
    ready: sr.status === 'complete',
    geojson: sr.geojson || { type: 'FeatureCollection', features: [] },
    summary: sr.summary || { total: 0, retractions: 0, corrections: 0, originals: 0, inciting: 0 }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`server listening on :${port}`);
});
