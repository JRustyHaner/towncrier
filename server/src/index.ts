// @ts-nocheck
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { newsdataFetcher } from './services/newsdataFetcher.js';
import Sentiment from 'sentiment';
import { extractArticleText } from './services/article-text-extractor/extractArticleText.js';
import { HybridFetcher } from './services/hybridFetcher.js';
import { extractCity } from './services/cityExtractor.js';
import { classifyStatus, analyzeMisinformationMetrics } from './services/statusClassifier.js';
import { getSources } from './services/newsdataFetcher.js';
import { fetchTrendData, compareTrends, analyzeTrendPhases } from './services/googleTrendsFetcher.js';
import { generateTrendPolygons, generateTimeWindowHeatmap } from './services/trendPolygonGenerator.js';
import { mediaBiasLookup } from './services/mediaBiasLookup.js';
import { filterArticlesBySimilarity, getSimilarityStats } from './services/jaccardSimilarity.js';
import trendsPuppeteerRouter from './services/trendsPuppeteerRouter.js';
import dataForSeoRouter from './services/dataForSeoRouter.js';
import dataForSeoTrendsRouter from './services/dataForSeoTrendsRouter.js';
import stateTrendPolygonsRouter from './services/stateTrendPolygonsRouter.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/trends', trendsPuppeteerRouter);

// DataForSEO Google Trends API route
app.use('/api/trends', dataForSeoTrendsRouter);

// DataForSEO SERP API route
app.use('/api/serp', dataForSeoRouter);

// US State polygons with trend data
app.use('/api/trends', stateTrendPolygonsRouter);

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
  progress?: {
    phase: string;
    current: number;
    total: number;
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
    detectedSignals?: string[];
    city: string;
    confidence: number;
    sentiment?: { score: number; comparative: number };
    sentimentLabel?: string;
    valence?: number;
    category?: string;
    bias?: number;
    factualReporting?: 'MIXED' | 'HIGH' | 'VERY_HIGH';
    trendValue?: number;
    firstArticleTime?: number;
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
  'news-article': '#22c55e',
  'biased-source': '#8b5cf6',
  'untruthful-source': '#d946ef'
};
const shapeMap: Record<string, string> = {
  retraction: 'circle',
  correction: 'square',
  'news-article': 'triangle',
  'biased-source': 'hexagon',
  'untruthful-source': 'diamond'
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
      'news-article': { color: colorMap['news-article'], shape: shapeMap['news-article'], label: 'News Article' },
      'biased-source': { color: colorMap['biased-source'], shape: shapeMap['biased-source'], label: 'Biased Source' },
      'untruthful-source': { color: colorMap['untruthful-source'], shape: shapeMap['untruthful-source'], label: 'Untruthful Source' }
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
      // Initialize search record to allow progress polling immediately
      activeSearches[id] = {
        id,
        terms,
        createdAt: new Date().toISOString(),
        status: 'processing',
        geojson: { type: 'FeatureCollection', features: [] },
        summary: { total: 0, retractions: 0, corrections: 0, originals: 0, inciting: 0 },
        progress: { phase: 'starting', current: 0, total: 0 }
      };

      let articles = await hybridFetcher.fetchArticles(terms, { limit, sources: searchSources });
      
      // Filter articles by word overlap with combined vocabulary
      // Keeps articles that share at least 1 word with other articles
      // This removes only completely off-topic noise
      const preSimilarityCount = articles.length;
      articles = filterArticlesBySimilarity(articles, 1);
      console.log(`[Search] Jaccard filter: ${preSimilarityCount} → ${articles.length} articles`);
      
      // Get similarity stats for debugging
      const stats = getSimilarityStats(articles, 1);
      console.log(`[Search] Word overlap stats - Mean: ${stats.mean.toFixed(2)} words, Min: ${stats.min}, Max: ${stats.max}`);
      
      const features: GeoJSONFeature[] = [];
      const summaryStats = { 
        total: 0, 
        retractions: 0, 
        corrections: 0, 
        newsArticles: 0,
        biasedSources: 0,
        untruthfulSources: 0,
        neutralBiasSources: 0,
        unknownBiasSources: 0
      };
      const classifications: any[] = [];
      const sentiment = new Sentiment();
      const sentimentScores: Array<{ id: string; score: number; comparative: number; }> = [];

      // Scrape missing article content in parallel (for those without content)
      const articlesWithContent = await Promise.all(
        articles.slice(0, limit).map(async (article) => {
          if (!article.content && article.link) {
            try {
              const scraped = await extractArticleText(article.link);
              return { ...article, content: scraped || '' };
            } catch (e) {
              return { ...article, content: '' };
            }
          }
          return article;
        })
      );

      // Initialize progress for city extraction
      activeSearches[id].progress = {
        phase: 'extracting-cities',
        current: 0,
        total: articlesWithContent.length
      };

      // Initialize media bias lookup
      await mediaBiasLookup.initialize();

      // Track first article time Initper location for size encoding
      const locationFirstArticleTime: Map<string, number> = new Map();

      // Process each article with bias lookup
      for (let i = 0; i < articlesWithContent.length; i++) {
        try {
          const article = articlesWithContent[i];
          
          let city;
          try {
            city = await extractCity(`${article.title} ${article.description}`, i, article.source, article.title, article.link);
          } catch (cityError) {
            console.error(`[Article ${i + 1}/${articlesWithContent.length}] City extraction error:`, cityError);
            // Use fallback location on error
            city = {
              name: 'Unknown',
              latitude: 0,
              longitude: 0,
              confidence: 0,
              source: 'error'
            };
          }

          console.log(`[Article ${i + 1}/${articlesWithContent.length}] "${article.source}" - Extracted city: ${city.name} (${city.latitude}, ${city.longitude})`);

          // if no city or coordinates, skip article
          if (!city || !city.latitude || !city.longitude) {
            // Update progress even for skipped articles
            activeSearches[id].progress = {
              phase: 'extracting-cities',
              current: i + 1,
              total: articlesWithContent.length
            };
            continue;
          }

          // Look up media bias and factual reporting ratings first
          // Try by source name first (works better for Google News), then by URL
          let biasRating;
          try {
            biasRating = await mediaBiasLookup.lookupSource(
              article.sourceUrl || article.link,
              article.source // Pass source name as second parameter
            );
          } catch (biasError) {
            console.error(`[Article ${i + 1}/${articlesWithContent.length}] Media bias lookup error:`, biasError);
            biasRating = { biasRating: undefined, factualReportingRating: undefined };
          }
          
          // If bias is unknown, set it to neutral (0)
          const bias = biasRating?.biasRating !== undefined ? biasRating.biasRating : 0;
          const isUnknownBias = biasRating?.biasRating === undefined;
          
          // Classify with bias and factual reporting data
          let statusClassification;
          try {
            statusClassification = classifyStatus(
              `${article.title} ${article.description}`,
              article.content,
              bias,
              biasRating?.factualReportingRating
            );
          } catch (classifyError) {
            console.error(`[Article ${i + 1}/${articlesWithContent.length}] Status classification error:`, classifyError);
            statusClassification = { status: 'news-article', confidence: 0, reason: 'classification-error', signals: [] };
          }
          classifications.push(statusClassification);

          // Sentiment analysis on title + description + content (now with scraped content if available)
          let sentimentResult;
          try {
            const text = [article.title, article.description, article.content].filter(Boolean).join(' ');
            sentimentResult = sentiment.analyze(text);
          } catch (sentimentError) {
            console.error(`[Article ${i + 1}/${articlesWithContent.length}] Sentiment analysis error:`, sentimentError);
            sentimentResult = { score: 0, comparative: 0 };
          }
          sentimentScores.push({
            id: article.id,
            score: sentimentResult.score,
            comparative: sentimentResult.comparative
          });

          // Calculate valence from sentiment (normalized to -1 to 1)
          const valence = Math.max(-1, Math.min(1, sentimentResult.comparative * 2));

          // Track first article timestamp at this location
          const locationKey = `${city.latitude},${city.longitude}`;
          const publishTime = new Date(article.publishDate).getTime();
          if (!locationFirstArticleTime.has(locationKey)) {
            locationFirstArticleTime.set(locationKey, publishTime);
          }

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
              confidence: city.confidence,
              sentiment: {
                score: sentimentResult.score,
                comparative: sentimentResult.comparative
              },
              sentimentLabel: sentimentResult.score > 0 ? 'positive' : sentimentResult.score < 0 ? 'negative' : 'neutral',
              valence: valence,
              category: statusClassification.status,
              bias: bias,
              factualReporting: biasRating?.factualReportingRating || undefined,
              unknownBias: isUnknownBias,
              firstArticleTime: locationFirstArticleTime.get(locationKey)
            }
          });

          summaryStats.total++;
          if (statusClassification.status === 'retraction') summaryStats.retractions++;
          else if (statusClassification.status === 'correction') summaryStats.corrections++;
          else if (statusClassification.status === 'news-article') summaryStats.newsArticles++;
          else if (statusClassification.status === 'biased-source') summaryStats.biasedSources++;
          else if (statusClassification.status === 'untruthful-source') summaryStats.untruthfulSources++;
          
          // Track unknown bias sources
          if (isUnknownBias) {
            summaryStats.unknownBiasSources = (summaryStats.unknownBiasSources || 0) + 1;
          } else if (bias >= -5 && bias <= 5) {
            // Track neutral bias sources (within -5 to 5 range)
            summaryStats.neutralBiasSources = (summaryStats.neutralBiasSources || 0) + 1;
          }

          // Update progress
          activeSearches[id].progress = {
            phase: 'extracting-cities',
            current: i + 1,
            total: articlesWithContent.length
          };
        } catch (articleError) {
          console.error(`[Article ${i + 1}/${articlesWithContent.length}] Unexpected error processing article:`, articleError);
          // Update progress and continue to next article
          activeSearches[id].progress = {
            phase: 'extracting-cities',
            current: i + 1,
            total: articlesWithContent.length
          };
        }
      }

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
        },
        sentimentScores,
        progress: { phase: 'complete', current: (activeSearches[id].progress?.total || 0), total: (activeSearches[id].progress?.total || 0) }
      };
    } catch (error) {
      console.error('Search error:', error);
      activeSearches[id] = {
        id,
        terms,
        createdAt: new Date().toISOString(),
        status: 'complete',
        geojson: { type: 'FeatureCollection', features: [] },
        summary: { total: 0, retractions: 0, corrections: 0, originals: 0, inciting: 0, disputed: 0, misleading: 0 },
        progress: { phase: 'error', current: 0, total: 0 }
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
    misinformationMetrics: sr.misinformationMetrics,
    progress: sr.progress || { phase: 'unknown', current: 0, total: 0 }
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

const port = process.env.PORT || 3001;


app.listen(port, () => {
  console.log(`server listening on :${port}`);
});


// NEW: Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Server shutting down...');
  process.exit(0);
});