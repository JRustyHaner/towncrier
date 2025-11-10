// @ts-nocheck
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { newsdataFetcher } from './services/newsdataFetcher.js';
import { HybridFetcher } from './services/hybridFetcher.js';
import { extractCity } from './services/cityExtractor.js';
import { classifyStatus, analyzeMisinformationMetrics } from './services/statusClassifier.js';
import { getSources } from './services/newsdataFetcher.js';
import { fetchTrendData, compareTrends, analyzeTrendPhases } from './services/googleTrendsFetcher.js';
import { generateTrendPolygons, generateTimeWindowHeatmap } from './services/trendPolygonGenerator.js';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize hybrid fetcher to combine NewsData.io and Google News
const hybridFetcher = new HybridFetcher();

// Transient in-memory search cache (per process only) not persisted
interface SearchResult {
  id: string;
  terms: string[];
  createdAt: string;
  status: 'processing' | 'complete';
  geojson?: GeoJSON.FeatureCollection;
  summary?: { 
    total: number; 
    retractions: number; 
    corrections: number; 
    originals: number; 
    inciting: number;
    disputed?: number;
    misleading?: number;
  };
  misinformationMetrics?: {
    highConfidenceIncidents: number;
    potentialMisinformation: number;
    misdirectedContent: number;
    topSignals: Array<[string, number]>;
  };
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
    statusConfidence: number;
    statusReason: string;
    detectedSignals?: string[]; // Misinformation signals detected
    city: string;
    confidence: number;
  };
};

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
  inciting: '#137fec',
  disputed: '#a78bfa',
  misleading: '#f97316'
};
const shapeMap: Record<string, string> = {
  retraction: 'circle',
  correction: 'square',
  original: 'triangle',
  inciting: 'ring',
  disputed: 'hexagon',
  misleading: 'diamond'
};

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, features: { storage: 'none', newsdata: true } });
});

// Legend endpoint
app.get('/api/legend', (_req, res) => {
  res.json({
    statuses: {
      retraction: { color: colorMap.retraction, shape: shapeMap.retraction, label: 'Retraction' },
      correction: { color: colorMap.correction, shape: shapeMap.correction, label: 'Correction' },
      original: { color: colorMap.original, shape: shapeMap.original, label: 'Original' },
      inciting: { color: colorMap.inciting, shape: shapeMap.inciting, label: 'Inciting' },
      disputed: { color: colorMap.disputed, shape: shapeMap.disputed, label: 'Disputed' },
      misleading: { color: colorMap.misleading, shape: shapeMap.misleading, label: 'Misleading' }
    }
  });
});

// Sources endpoint
app.get('/api/sources', async (_req, res) => {
  try {
    const sources = await getSources({ country: 'us' });
    res.json({
      status: 'success',
      count: sources.length,
      availableSources: sources.map((source: any) => ({
        id: source.id,
        name: source.name,
        url: source.url,
        category: source.category,
        language: source.language,
        country: source.country
      }))
    });
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch available sources',
      count: 0,
      availableSources: []
    });
  }
});

// Default curated sources (disabled filtering by default for stability)
const DEFAULT_SOURCES: string[] = [];

// Search endpoint (POST)
app.post('/api/search', async (req, res) => {
  const { terms = [], limit = 100, sources } = req.body || {};
  const id = randomUUID();
  
  // Use default sources if none specified (or use provided sources)
  const searchSources = sources && sources.length > 0 ? sources : DEFAULT_SOURCES;

  // Return search_id immediately
  res.status(202).json({ search_id: id, status: 'processing' });

  // Process in background
  (async () => {
    try {
      const articles = await hybridFetcher.fetchArticles(terms, { limit, sources: searchSources });
      const features: GeoJSONFeature[] = [];
      const summaryStats = { 
        total: 0, 
        retractions: 0, 
        corrections: 0, 
        originals: 0, 
        inciting: 0,
        disputed: 0,
        misleading: 0
      };
      const classifications: any[] = [];

      articles.slice(0, limit).forEach((article, index) => {
        const city = extractCity(`${article.title} ${article.description}`, index, article.source, article.title);
        const statusClassification = classifyStatus(`${article.title} ${article.description}`, article.content);

        classifications.push(statusClassification);

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
            statusConfidence: statusClassification.confidence,
            statusReason: statusClassification.reason,
            detectedSignals: statusClassification.signals || [],
            city: city.name,
            confidence: city.confidence
          }
        });

        summaryStats.total++;
        if (statusClassification.status === 'retraction') summaryStats.retractions++;
        else if (statusClassification.status === 'correction') summaryStats.corrections++;
        else if (statusClassification.status === 'original') summaryStats.originals++;
        else if (statusClassification.status === 'inciting') summaryStats.inciting++;
        else if (statusClassification.status === 'disputed') summaryStats.disputed++;
        else if (statusClassification.status === 'misleading') summaryStats.misleading++;
      });

      const geojson = {
        type: 'FeatureCollection',
        features
      };

      // Calculate misinformation metrics
      const misinfoMetrics = analyzeMisinformationMetrics(classifications);

      activeSearches[id] = {
        id,
        terms,
        createdAt: new Date().toISOString(),
        status: 'complete',
        geojson,
        summary: summaryStats,
        misinformationMetrics: {
          highConfidenceIncidents: misinfoMetrics.highConfidenceIncidents,
          potentialMisinformation: misinfoMetrics.potentialMisinformation,
          misdirectedContent: misinfoMetrics.misdirectedContent,
          topSignals: Array.from(misinfoMetrics.topSignals.entries())
        }
      };
    } catch (error) {
      console.error('Search error:', error);
      activeSearches[id] = {
        id,
        terms,
        createdAt: new Date().toISOString(),
        status: 'complete',
        geojson: { type: 'FeatureCollection', features: [] },
        summary: { total: 0, retractions: 0, corrections: 0, originals: 0, inciting: 0, disputed: 0, misleading: 0 }
      };
    }
  })();
});

// Get search results endpoint
app.get('/api/search/:id/results', (req, res) => {
  const sr = activeSearches[req.params.id];
  if (!sr) return res.status(404).json({ error: 'NOT_FOUND' });

  res.json({
    search_id: sr.id,
    ready: sr.status === 'complete',
    geojson: sr.geojson || { type: 'FeatureCollection', features: [] },
    summary: sr.summary || { total: 0, retractions: 0, corrections: 0, originals: 0, inciting: 0, disputed: 0, misleading: 0 },
    misinformationMetrics: sr.misinformationMetrics
  });
});

// Misinformation analysis endpoint - detailed signals and patterns
app.get('/api/search/:id/misinformation-report', (req, res) => {
  const sr = activeSearches[req.params.id];
  if (!sr) return res.status(404).json({ error: 'NOT_FOUND' });

  if (!sr.geojson || sr.geojson.features.length === 0) {
    return res.json({
      search_id: sr.id,
      analysis: {
        totalArticles: 0,
        articlesWithSignals: 0,
        topMisinformationPatterns: [],
        highRiskArticles: []
      }
    });
  }

  // Analyze all features for misinformation patterns
  const articlesWithSignals = sr.geojson.features.filter(f => 
    f.properties.detectedSignals && f.properties.detectedSignals.length > 0
  );

  // Aggregate signals to identify top patterns
  const signalCounts = new Map<string, number>();
  const highRiskArticles = [];

  for (const feature of sr.geojson.features) {
    if (feature.properties.detectedSignals) {
      for (const signal of feature.properties.detectedSignals) {
        signalCounts.set(signal, (signalCounts.get(signal) || 0) + 1);
      }
    }

    // Identify high-risk articles (confidence > 0.75)
    if (feature.properties.statusConfidence > 0.75 && feature.properties.status !== 'original') {
      highRiskArticles.push({
        title: feature.properties.title,
        status: feature.properties.status,
        confidence: feature.properties.statusConfidence,
        reason: feature.properties.statusReason,
        signals: feature.properties.detectedSignals || [],
        source: feature.properties.source,
        link: feature.properties.link
      });
    }
  }

  const topPatterns = Array.from(signalCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pattern, count]) => ({ pattern, count }));

  res.json({
    search_id: sr.id,
    analysis: {
      totalArticles: sr.geojson.features.length,
      articlesWithSignals: articlesWithSignals.length,
      signalPercentage: (articlesWithSignals.length / sr.geojson.features.length * 100).toFixed(2) + '%',
      topMisinformationPatterns: topPatterns,
      highRiskArticles: highRiskArticles.slice(0, 20)
    }
  });
});

// Classification debug endpoint - for understanding how articles are classified
app.post('/api/classify', async (req, res) => {
  const { title = '', description = '', content = '' } = req.body || {};

  if (!title && !description) {
    return res.status(400).json({ error: 'Title or description required' });
  }

  try {
    const classification = classifyStatus(
      `${title} ${description}`,
      content
    );

    res.json({
      input: { title, description, contentLength: content?.length || 0 },
      classification: {
        status: classification.status,
        confidence: classification.confidence,
        reason: classification.reason,
        signals: classification.signals || []
      }
    });
  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({ error: 'Classification failed' });
  }
});

// Trends endpoint - visualize how trending patterns evolve over time with polygon overlays
app.post('/api/trends', async (req, res) => {
  const { keywords = [], startDate, endDate, geo = 'US', windowDays = 7 } = req.body || {};

  if (!keywords || keywords.length === 0) {
    return res.status(400).json({ error: 'At least one keyword is required' });
  }

  res.status(202).json({
    status: 'processing',
    keywords,
    message: 'Trend analysis started - this may take 30-60 seconds'
  });

  // Process in background
  (async () => {
    try {
      const startTime = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const endTime = endDate ? new Date(endDate) : new Date();

      let trendAnalysis;

      // Fetch trends for all keywords
      if (keywords.length === 1) {
        trendAnalysis = await fetchTrendData(keywords[0], startTime, endTime, geo);
      } else {
        const results = await compareTrends(keywords, startTime, endTime, geo);
        if (results.length === 0) {
          throw new Error('Failed to fetch trend data for any keywords');
        }
        trendAnalysis = results[0]; // Return primary keyword analysis
      }

      // Generate visualization polygons
      const trendVisualization = generateTrendPolygons(trendAnalysis);

      // Analyze trend phases (emergence, growth, peak, decline, death)
      const trendPhases = analyzeTrendPhases(trendAnalysis);

      // Generate time-window based heatmap
      const timeWindowHeatmap = generateTimeWindowHeatmap(trendAnalysis, windowDays);

      // Calculate time to "death" (when trend drops below 10% of peak)
      const timeToDeathDays = trendAnalysis.timeToDeathDays;
      const trendDeathDate = trendAnalysis.trendDeathTime?.toISOString() || null;

      console.log(`Trend analysis complete for "${keywords[0]}": ${timeToDeathDays} days to death, peak: ${trendAnalysis.peakValue}%`);

      // Store results for retrieval
      const trendId = randomUUID();
      activeSearches[trendId] = {
        id: trendId,
        terms: keywords,
        createdAt: new Date().toISOString(),
        status: 'complete',
        geojson: {
          type: 'FeatureCollection',
          features: trendVisualization.polygons
        } as any,
        summary: {
          total: trendAnalysis.timelineData.length,
          retractions: 0,
          corrections: 0,
          originals: 0,
          inciting: 0,
          disputed: 0,
          misleading: 0
        }
      };

      console.log(`[${trendId}] Trend visualization stored`);
    } catch (error) {
      console.error('Trend analysis error:', error);
    }
  })();
});

// Get trends visualization - retrieve polygon-based trend data
app.get('/api/trends/:keyword', async (req, res) => {
  const keyword = req.params.keyword;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const geo = (req.query.geo as string) || 'US';

  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  try {
    const startTime = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endTime = endDate ? new Date(endDate) : new Date();

    const trendAnalysis = await fetchTrendData(keyword, startTime, endTime, geo);
    const trendVisualization = generateTrendPolygons(trendAnalysis);
    const trendPhases = analyzeTrendPhases(trendAnalysis);
    const timeWindowHeatmap = generateTimeWindowHeatmap(trendAnalysis, 7);

    res.json({
      keyword,
      visualization: trendVisualization,
      phases: trendPhases,
      timeWindowHeatmap,
      statistics: {
        peakIntensity: trendAnalysis.peakValue,
        peakDate: trendAnalysis.peakTime,
        timeToDeathDays: trendAnalysis.timeToDeathDays,
        trendDeathDate: trendAnalysis.trendDeathTime?.toISOString() || null,
        lifespanDays: Math.floor((trendAnalysis.endTime.getTime() - trendAnalysis.startTime.getTime()) / (24 * 60 * 60 * 1000)),
        dataPoints: trendAnalysis.timelineData.length,
        avgIntensity: Math.round(
          trendAnalysis.timelineData.reduce((sum, p) => sum + p.value, 0) / trendAnalysis.timelineData.length
        )
      }
    });
  } catch (error) {
    console.error('Trend retrieval error:', error);
    res.status(500).json({
      error: 'Failed to fetch trend data',
      message: error instanceof Error ? error.message : 'Unknown error',
      keyword
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`server listening on :${port}`);
});
