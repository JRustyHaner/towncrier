import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView from './components/MapView';
import TrendGraphContainer from './components/TrendGraphContainer';
import SentimentTimelineGraph from './components/SentimentTimelineGraph';
import TrendGraphView from './components/TrendGraphView';
import SentimentGraphView from './components/SentimentGraphView';
import TrendValueSelector, { TrendValueMode } from './components/TrendValueSelector';

const { width, height } = Dimensions.get('window');

interface Article {
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
  latitude?: number;
  longitude?: number;
  bias?: number; // bias rating from source
  factualReporting?: 'MIXED' | 'HIGH' | 'VERY_HIGH'; // factual reporting rating from source
  sentiment?: {
    score: number;
    comparative: number;
  };
  searchCategory?: 'original' | 'negation' | 'bias';
  claims?: string[];
  contradictions?: Array<{
    articleId: string;
    title: string;
    claimType: 'refutes' | 'supports' | 'neutral';
    confidence: number;
  }>;
}

interface Legend {
  statuses: Record<string, { color: string; shape: string; label: string }>;
}

// Accepts both custom polygons and GeoJSON state polygons
interface TrendPolygon {
  id?: string;
  type?: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: {
    NAME?: string;
    trend_value?: number;
    last_trending_date?: string | null;
    color?: string;
    opacity?: number;
    tooltip?: string;
    // legacy/custom fields
    timeRange?: { start: string; end: string };
    intensity?: number;
    intensityPercentage?: number;
    phase?: string;
  };
}

const API_BASE_URL = 'http://localhost:3001';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [legend, setLegend] = useState<Legend | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [summary, setSummary] = useState({ total: 0, retractions: 0, corrections: 0, newsArticles: 0, biasedSources: 0, untruthfulSources: 0 });
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'trends' | 'sentiment' | 'bias' | 'truthfulness'>('map');
  const [trendPolygons, setTrendPolygons] = useState<TrendPolygon[]>([]);
  const [trendKeyword, setTrendKeyword] = useState('');
  const [trendStats, setTrendStats] = useState<any>(null);
  const [trendTimeSeries, setTrendTimeSeries] = useState<Array<{ date: string; value: number }>>([]);
  const [trendMultiplePhrasesData, setTrendMultiplePhrasesData] = useState<Array<{ phrase: string; data: Array<{ date: string; value: number }> }>>([]);
  const [trendTimeout, setTrendTimeout] = useState(false);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [trendValueMode, setTrendValueMode] = useState<TrendValueMode>('max');

  // Color scheme
  const colors = isDark
    ? {
        background: '#101922',
        surface: '#0f172a',
        text: '#f8fafc',
        textSecondary: '#94a3b8',
        border: '#1f2937',
        primary: '#137fec'
      }
    : {
        background: '#f6f7f8',
        surface: '#ffffff',
        text: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        primary: '#137fec'
      };

  useEffect(() => {
    fetchLegend();
  }, []);

  const fetchLegend = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/legend`);
      const data = await res.json();
      setLegend(data);
    } catch (error) {
      console.error('Failed to fetch legend:', error);
    }
  };

  const extractArticleKeywords = (articles: Article[]): Array<{ keyword: string; sentiment: number; frequency: number }> => {
    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when',
      'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some',
      'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very'
    ]);

    const keywordMap: Record<string, { sentiment: number; count: number }> = {};

    // Extract keywords from titles and descriptions
    articles.forEach(article => {
      const text = `${article.title} ${article.description}`.toLowerCase();
      const sentimentScore = article.sentiment?.score || 0;

      // Split into words and filter
      const words = text.match(/\b\w+\b/g) || [];
      words.forEach(word => {
        if (word.length > 3 && !stopWords.has(word)) {
          if (!keywordMap[word]) {
            keywordMap[word] = { sentiment: 0, count: 0 };
          }
          keywordMap[word].sentiment += sentimentScore;
          keywordMap[word].count += 1;
        }
      });
    });

    // Calculate average sentiment and convert to array
    const keywords = Object.entries(keywordMap)
      .map(([keyword, { sentiment, count }]) => ({
        keyword,
        sentiment: sentiment / count,
        frequency: count
      }))
      .filter(k => k.frequency >= 3) // Only keep keywords appearing 3+ times
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10); // Top 10 keywords

    return keywords;
  };

  const extractClaims = (article: Article): string[] => {
    // Extract key claims from title and description
    // Identify subject-verb patterns and main statements
    const text = `${article.title} ${article.description}`.toLowerCase();
    
    // Common claim patterns
    const claimPatterns = [
      /([a-z\s]+) (is|are|was|were) ([a-z\s]+)/g,
      /([a-z\s]+) (wins?|loses?|defeats?|approves?|rejects?) ([a-z\s]+)/g,
      /([a-z\s]+) (increases?|decreases?|falls?|rises?|grows?) ([a-z\s]+)/g,
      /([a-z\s]+) (announces?|declares?|claims?) ([a-z\s]+)/g,
    ];

    const claims: string[] = [];
    claimPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const claim = match[0].trim();
        if (claim.length > 10 && !claims.includes(claim)) {
          claims.push(claim);
        }
      }
    });

    return claims.slice(0, 5); // Return top 5 claims
  };

  const detectContradictions = (articles: Article[]): Article[] => {
    // Extract claims for all articles
    const articlesWithClaims = articles.map(article => ({
      ...article,
      claims: extractClaims(article)
    }));

    // Find contradicting claims
    const contradictionKeywords = {
      refute: ['not', 'fake', 'false', 'denies', 'rejects', 'debunked', 'hoax', 'never', 'didn\'t', 'wasn\'t'],
      support: ['confirms', 'verifies', 'proves', 'true', 'validated', 'real'],
      neutral: ['differs', 'contrasts', 'opposes']
    };

    return articlesWithClaims.map((article, idx) => {
      const contradictions: Article['contradictions'] = [];

      article.claims?.forEach(claim => {
        // Compare against other articles
        articlesWithClaims.forEach((otherArticle, otherIdx) => {
          if (idx === otherIdx) return;

          otherArticle.claims?.forEach(otherClaim => {
            // Check if claims share similar subject matter but different conclusions
            const claimWords = new Set(claim.split(/\s+/));
            const otherClaimWords = new Set(otherClaim.split(/\s+/));
            
            // Calculate similarity
            const intersection = [...claimWords].filter(x => otherClaimWords.has(x));
            const union = new Set([...claimWords, ...otherClaimWords]);
            const similarity = intersection.length / union.size;

            // If similar (>50%) but sentiment differs, it's a contradiction
            if (similarity > 0.5) {
              const claimSentiment = article.sentiment?.score || 0;
              const otherSentiment = otherArticle.sentiment?.score || 0;
              
              // Opposite sentiments suggest contradiction
              if ((claimSentiment > 0 && otherSentiment < -3) || (claimSentiment < -3 && otherSentiment > 0)) {
                // Determine refutation type
                const claimHasRefute = contradictionKeywords.refute.some(kw => claim.includes(kw));
                const otherHasRefute = contradictionKeywords.refute.some(kw => otherClaim.includes(kw));
                const claimType = claimHasRefute || otherHasRefute ? 'refutes' : 'neutral' as const;

                contradictions.push({
                  articleId: otherArticle.id,
                  title: otherArticle.title,
                  claimType,
                  confidence: Math.min(0.95, similarity * 100)
                });
              }
            }
          });
        });
      });

      // Update article status if it has contradictions with refutation language
      let updatedArticle = { ...article, contradictions: contradictions.slice(0, 3) };
      
      // Check if this article has contradictions with "refutes" type
      const hasRefutingContradictions = contradictions.some(c => c.claimType === 'refutes');
      
      // If article has contradictions that refute it, mark as misleading
      if (hasRefutingContradictions && contradictions.length > 0) {
        // Count how many articles refute this one
        const refutingCount = contradictions.filter(c => c.claimType === 'refutes').length;
        
        // If multiple articles contradict this one, it's likely misleading
        if (refutingCount >= Math.max(1, Math.floor(articlesWithClaims.length * 0.2))) {
          // Consensus says this is misleading
          updatedArticle = { ...updatedArticle, status: 'misleading' };
        }
      }
      
      return updatedArticle;
    });
  };

  const extractNounAdjectivePhrases = (text: string): string[] => {
    // Convert to lowercase and split into words
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    
    // Common nouns and adjectives based on simple heuristics
    const commonEndings = {
      noun: ['ion', 'ment', 'ness', 'ship', 'hood', 'dom', 'ing', 'er', 'or', 'ist', 'ity'],
      adjective: ['al', 'ive', 'ful', 'less', 'ous', 'able', 'ible', 'ic', 'ical', 'ed', 'ing']
    };
    
    // Simple stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);

    // Identify potential nouns/adjectives
    const contentWords = words.filter(word => 
      !stopWords.has(word) && word.length > 2
    );

    // Extract noun-adjective phrases (2-3 word combinations)
    const phrases: string[] = [];
    for (let i = 0; i < contentWords.length; i++) {
      // Single word
      if (contentWords[i].length > 4) {
        phrases.push(contentWords[i]);
      }
      
      // Two-word phrase
      if (i + 1 < contentWords.length) {
        const twoWord = `${contentWords[i]} ${contentWords[i + 1]}`;
        if (twoWord.length <= 20) {
          phrases.push(twoWord);
        }
      }
      
      // Three-word phrase
      if (i + 2 < contentWords.length) {
        const threeWord = `${contentWords[i]} ${contentWords[i + 1]} ${contentWords[i + 2]}`;
        if (threeWord.length <= 30) {
          phrases.push(threeWord);
        }
      }
    }

    // Remove duplicates and return top 5
    const uniquePhrases = [...new Set(phrases)];
    return uniquePhrases.slice(0, 5);
  };

  // Helper function to calculate trend value based on mode
  const calculateTrendValue = (mainValue: number, allTermsValues: number[]): number => {
    switch (trendValueMode) {
      case 'max':
        return Math.max(mainValue, ...allTermsValues);
      case 'min':
        return Math.min(mainValue, ...allTermsValues);
      case 'average':
        const allValues = [mainValue, ...allTermsValues].filter(v => v > 0);
        return allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;
      case 'primary':
        return mainValue;
      default:
        return mainValue;
    }
  };

  const generateSearchTerms = (query: string): { original: string[]; negation: string[]; bias: string[] } => {
    const original = [query];
    const negation: string[] = [];
    const bias: string[] = [];
    
    // Opposite/Negation searches based on keywords
    const oppositeMap: Record<string, string[]> = {
      'wins': ['loses', 'defeated by', 'fails'],
      'loses': ['wins', 'defeats', 'beats'],
      'true': ['false', 'fake', 'hoax'],
      'false': ['true', 'real', 'verified'],
      'guilty': ['innocent', 'acquitted', 'cleared'],
      'innocent': ['guilty', 'convicted', 'condemned'],
      'success': ['failure', 'fails', 'collapses'],
      'failure': ['success', 'succeeds', 'triumph'],
      'approved': ['rejected', 'denied', 'blocked'],
      'rejected': ['approved', 'accepted', 'passed'],
      'increase': ['decrease', 'drops', 'falls'],
      'decrease': ['increase', 'rises', 'grows'],
    };

    // Negative bias search terms
    const negativeBiasTerms = ['hoax', 'witch hunt', 'conspiracy', 'fake news', 'scam', 'fraud'];

    // Helper to randomly select from array
    const randomChoice = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // Helper to randomly select subset (1 or more)
    const randomSubset = <T,>(arr: T[]): T[] => {
      const size = Math.floor(Math.random() * arr.length) + 1; // 1 to arr.length
      const shuffled = [...arr].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, size);
    };

    // Generate multiple negation searches by randomly picking opposite terms per word
    const lowerQuery = query.toLowerCase();
    const matchedKeywords: Array<{ keyword: string; opposites: string[] }> = [];
    
    for (const [keyword, opposites] of Object.entries(oppositeMap)) {
      if (lowerQuery.includes(keyword)) {
        matchedKeywords.push({ keyword, opposites });
      }
    }

    // If we found keywords to negate, generate multiple negation searches
    if (matchedKeywords.length > 0) {
      // Generate 3-5 negation searches with different random combinations
      const numNegationSearches = Math.min(5, Math.max(3, matchedKeywords.length * 2));
      const generatedQueries = new Set<string>();

      for (let i = 0; i < numNegationSearches; i++) {
        let negatedQuery = query;
        
        // For each matched keyword, randomly select 1+ opposite terms to use
        matchedKeywords.forEach(({ keyword, opposites }) => {
          const selectedOpposites = randomSubset(opposites);
          const selectedOpposite = randomChoice(selectedOpposites);
          negatedQuery = negatedQuery.replace(new RegExp(keyword, 'gi'), selectedOpposite);
        });
        
        if (negatedQuery !== query) {
          generatedQueries.add(negatedQuery);
        }
      }

      negation.push(...Array.from(generatedQueries));
    }

    // Add NOT operator query to negation
    const notQuery = `NOT ${query}`;
    if (!negation.includes(notQuery)) {
      negation.push(notQuery);
    }

    // Add single bias search by combining query with one random bias term
    const selectedBiasTerm = randomChoice(negativeBiasTerms);
    const biasedQuery = `${query} ${selectedBiasTerm}`;
    bias.push(biasedQuery);

    return { original, negation, bias };
  };

  const handleSearch = async () => {
    setProgressStep('Searching articles...');
    setProgressModalVisible(true);
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      // Generate search terms organized by category
      const { original, negation, bias } = generateSearchTerms(searchTerm);
      
      // Make separate API calls for each category to get distinct results
      setProgressStep('Searching original articles...');
      const originalRes = await fetch(`${API_BASE_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms: original, limit: 300 })
      });
      const { search_id: originalId } = await originalRes.json();

      setProgressStep('Searching negation and opposing articles...');
      const negationRes = await fetch(`${API_BASE_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms: negation, limit: 300 })
      });
      const { search_id: negationId } = await negationRes.json();

      setProgressStep('Searching biased and hoax articles...');
      const biasRes = await fetch(`${API_BASE_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms: bias, limit: 300 })
      });
      const { search_id: biasId } = await biasRes.json();

      // Poll for all results with exponential backoff
      setProgressStep('Waiting for search results...');
      let allResults: any[] = [];
      
      const pollResults = async (searchId: string, category: string) => {
        let attempts = 0;
        const maxAttempts = 30;
        let delay = 500;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay));
          const resultsRes = await fetch(`${API_BASE_URL}/api/search/${searchId}/results`);
          
          if (!resultsRes.ok) {
            attempts++;
            delay = Math.min(delay * 1.2, 2000);
            continue;
          }

          const results = await resultsRes.json();
          if (results.ready) {
            return { ...results, category };
          }
          
          attempts++;
          delay = Math.min(delay * 1.2, 2000);
        }
        return null;
      };

      // Wait for all three searches to complete
      const [originalResults, negationResults, biasResults] = await Promise.all([
        pollResults(originalId, 'original'),
        pollResults(negationId, 'negation'),
        pollResults(biasId, 'bias')
      ]);

      // Combine results and tag by category
      const allArticles: any[] = [];
      if (originalResults?.geojson?.features) {
        allArticles.push(...originalResults.geojson.features.map((f: any) => ({
          ...f.properties,
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          searchCategory: 'original'
        })));
      }
      if (negationResults?.geojson?.features) {
        allArticles.push(...negationResults.geojson.features.map((f: any) => ({
          ...f.properties,
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          searchCategory: 'negation'
        })));
      }
      if (biasResults?.geojson?.features) {
        allArticles.push(...biasResults.geojson.features.map((f: any) => ({
          ...f.properties,
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          searchCategory: 'bias'
        })));
      }

      // Detect contradictions between articles
      const articlesWithAnalysis = detectContradictions(allArticles);
      setArticles(articlesWithAnalysis);
      
      // Combine summaries from all search results
      const combinedSummary = {
        total: (originalResults?.summary?.total || 0) + (negationResults?.summary?.total || 0) + (biasResults?.summary?.total || 0),
        retractions: (originalResults?.summary?.retractions || 0) + (negationResults?.summary?.retractions || 0) + (biasResults?.summary?.retractions || 0),
        corrections: (originalResults?.summary?.corrections || 0) + (negationResults?.summary?.corrections || 0) + (biasResults?.summary?.corrections || 0),
        newsArticles: (originalResults?.summary?.newsArticles || 0) + (negationResults?.summary?.newsArticles || 0) + (biasResults?.summary?.newsArticles || 0),
        biasedSources: (originalResults?.summary?.biasedSources || 0) + (negationResults?.summary?.biasedSources || 0) + (biasResults?.summary?.biasedSources || 0),
        untruthfulSources: (originalResults?.summary?.untruthfulSources || 0) + (negationResults?.summary?.untruthfulSources || 0) + (biasResults?.summary?.untruthfulSources || 0)
      };
      setSummary(combinedSummary);

      // Reset analysis flag - it will be set to true once trends complete
      setAnalysisComplete(false);

      // Automatically load and display trends overlay after articles are loaded
      if (searchTerm.trim()) {
        setProgressStep('Fetching trend data...');
        await fetchStateTrendPolygons(searchTerm, true);
      }
  } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
      setProgressModalVisible(false);
      setProgressStep('');
    }
  };


  // Fetch state polygons with trend data from backend - falls back to article volume
  const fetchStateTrendPolygons = async (keyword: string, skipLoading?: boolean) => {
    if (!keyword.trim()) return;
    if (!skipLoading) setLoading(true);
    setTrendKeyword(keyword);
    setTrendTimeout(false);
    try {
      setProgressStep('Calculating trends from article volume...');
      
      // Calculate trends from article volume grouped by date
      const articlesByDate: Record<string, number> = {};
      
      articles.forEach(article => {
        const date = new Date(article.publishDate).toISOString().slice(0, 10);
        articlesByDate[date] = (articlesByDate[date] || 0) + 1;
      });
      
      // Convert to time series
      const dates = Object.keys(articlesByDate).sort();
      if (dates.length === 0) {
        setProgressStep('No articles available for trend calculation.');
        setTrendTimeSeries([]);
        setTrendMultiplePhrasesData([]);
        setAnalysisComplete(true);
        return;
      }
      
      // Calculate 7-day rolling average for smoother trend
      const timeSeries = dates.map((date, idx) => {
        const windowStart = Math.max(0, idx - 3);
        const windowEnd = Math.min(dates.length, idx + 4);
        let sum = 0;
        for (let i = windowStart; i < windowEnd; i++) {
          sum += articlesByDate[dates[i]];
        }
        const average = Math.round(sum / (windowEnd - windowStart));
        return { date, value: average };
      });
      
      setTrendTimeSeries(timeSeries);
      
      // Extract noun-adjective phrases from keyword for multi-phrase analysis
      const phrases = [keyword, ...extractNounAdjectivePhrases(keyword)];
      
      // Create phrase trend data - for now, just use the main trend for all phrases
      // In a more sophisticated version, we could filter articles by phrase keywords
      const phraseData = phrases.map(phrase => ({
        phrase,
        data: timeSeries
      }));
      
      setTrendMultiplePhrasesData(phraseData);
      setTrendPolygons([]);
      setTrendStats(null);
      setProgressStep(`Calculated trends from ${articles.length} articles across ${dates.length} days.`);
      
      // Mark analysis as complete
      setAnalysisComplete(true);
    } catch (error) {
      console.warn('Error calculating trends:', error instanceof Error ? error.message : 'Unknown error');
      setProgressStep('Error calculating trends. Continuing without trends.');
      setTrendTimeSeries([]);
      setTrendMultiplePhrasesData([]);
      setAnalysisComplete(true);
    } finally {
      if (!skipLoading) setLoading(false);
    }
      {/* Progress Modal */}
      <Modal
        visible={progressModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProgressModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, padding: 24, borderRadius: 12, alignItems: 'center', maxWidth: 320 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Analyzing Data</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15, marginBottom: 20, textAlign: 'center' }}>
              {progressStep || 'Working...'}
            </Text>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        </View>
      </Modal>
  };
      {/* Trend Timeout Modal */}
      <Modal
        visible={trendTimeout}
        transparent
        animationType="fade"
        onRequestClose={() => setTrendTimeout(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, padding: 24, borderRadius: 12, alignItems: 'center', maxWidth: 320 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Trend Data Timeout</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15, marginBottom: 20, textAlign: 'center' }}>
              The backend is taking too long to respond with trend data. Please try again later or check your server.
            </Text>
            <TouchableOpacity onPress={() => setTrendTimeout(false)} style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'retraction':
        return '#ef4444';
      case 'correction':
        return '#f59e0b';
      case 'original':
        return '#22c55e';
      case 'inciting':
        return '#137fec';
      case 'misleading':
        return '#ec4899'; // Pink/Magenta for misleading
      case 'disputed':
        return '#a78bfa'; // Purple for disputed
      default:
        return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'retraction':
        return 'circle';
      case 'correction':
        return 'square';
      case 'original':
        return 'triangle';
      case 'inciting':
        return 'ring';
      default:
        return 'circle';
    }
  };

  const getSentimentLabel = (score: number) => {
    if (score > 3) return 'Very Positive';
    if (score > 1) return 'Positive';
    if (score > -1) return 'Neutral';
    if (score > -3) return 'Negative';
    return 'Very Negative';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Town Crier</Text>
        <TouchableOpacity
          onPress={() => setIsDark(!isDark)}
          style={[styles.themeToggle, { backgroundColor: colors.primary }]}
        >
          <MaterialCommunityIcons
            name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'}
            size={20}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search articles..."
          placeholderTextColor={colors.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          onPress={handleSearch}
          disabled={loading}
          style={[styles.searchButton, { backgroundColor: colors.primary }]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Legend */}
      {legend && (
        <ScrollView
          horizontal
          style={[styles.legendContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
          showsHorizontalScrollIndicator={false}
        >
          {Object.entries(legend.statuses).map(([key, { color, shape, label }]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: color }]} />
              <Text style={[styles.legendLabel, { color: colors.text }]}>{label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Summary Stats as Compact Legend */}
      {summary.total > 0 && (
        <ScrollView
          horizontal
          style={[styles.summaryLegendContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.summaryLegendItem}>
            <Text style={[styles.summaryLegendLabel, { color: colors.textSecondary }]}>Total:</Text>
            <Text style={[styles.summaryLegendValue, { color: '#137fec' }]}>{summary.total}</Text>
          </View>
          <View style={styles.summaryLegendItem}>
            <Text style={[styles.summaryLegendLabel, { color: colors.textSecondary }]}>Retractions:</Text>
            <Text style={[styles.summaryLegendValue, { color: '#ef4444' }]}>{summary.retractions}</Text>
          </View>
          <View style={styles.summaryLegendItem}>
            <Text style={[styles.summaryLegendLabel, { color: colors.textSecondary }]}>Corrections:</Text>
            <Text style={[styles.summaryLegendValue, { color: '#f59e0b' }]}>{summary.corrections}</Text>
          </View>
          <View style={styles.summaryLegendItem}>
            <Text style={[styles.summaryLegendLabel, { color: colors.textSecondary }]}>News Articles:</Text>
            <Text style={[styles.summaryLegendValue, { color: '#22c55e' }]}>{summary.newsArticles}</Text>
          </View>
          <View style={styles.summaryLegendItem}>
            <Text style={[styles.summaryLegendLabel, { color: colors.textSecondary }]}>Biased Sources:</Text>
            <Text style={[styles.summaryLegendValue, { color: '#8b5cf6' }]}>{summary.biasedSources}</Text>
          </View>
          <View style={styles.summaryLegendItem}>
            <Text style={[styles.summaryLegendLabel, { color: colors.textSecondary }]}>Untruthful Sources:</Text>
            <Text style={[styles.summaryLegendValue, { color: '#d946ef' }]}>{summary.untruthfulSources}</Text>
          </View>
        </ScrollView>
      )}

      {/* Tab Navigation */}
      {articles.length > 0 && (
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setActiveTab('map')}
            style={[
              styles.tab,
              activeTab === 'map' && [styles.tabActive, { borderBottomColor: colors.primary }]
            ]}
          >
            <MaterialCommunityIcons 
              name="map" 
              size={20} 
              color={activeTab === 'map' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 'map' ? colors.primary : colors.textSecondary }]}>
              Map
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('list')}
            style={[
              styles.tab,
              activeTab === 'list' && [styles.tabActive, { borderBottomColor: colors.primary }]
            ]}
          >
            <MaterialCommunityIcons 
              name="list" 
              size={20} 
              color={activeTab === 'list' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 'list' ? colors.primary : colors.textSecondary }]}>
              List
            </Text>
          </TouchableOpacity>
          {(trendTimeSeries.length > 0 || trendMultiplePhrasesData.length > 0) && (
          <TouchableOpacity
            onPress={() => setActiveTab('trends')}
            style={[
              styles.tab,
              activeTab === 'trends' && [styles.tabActive, { borderBottomColor: colors.primary }]
            ]}
          >
            <MaterialCommunityIcons 
              name="chart-line" 
              size={20} 
              color={activeTab === 'trends' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 'trends' ? colors.primary : colors.textSecondary }]}>
              Trends
            </Text>
          </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setActiveTab('sentiment')}
            style={[
              styles.tab,
              activeTab === 'sentiment' && [styles.tabActive, { borderBottomColor: colors.primary }]
            ]}
          >
            <MaterialCommunityIcons 
              name="heart" 
              size={20} 
              color={activeTab === 'sentiment' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 'sentiment' ? colors.primary : colors.textSecondary }]}>
              Sentiment
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('bias')}
            style={[
              styles.tab,
              activeTab === 'bias' && [styles.tabActive, { borderBottomColor: colors.primary }]
            ]}
          >
            <MaterialCommunityIcons 
              name="scale-balance" 
              size={20} 
              color={activeTab === 'bias' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 'bias' ? colors.primary : colors.textSecondary }]}>
              Bias
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('truthfulness')}
            style={[
              styles.tab,
              activeTab === 'truthfulness' && [styles.tabActive, { borderBottomColor: colors.primary }]
            ]}
          >
            <MaterialCommunityIcons 
              name="check-circle" 
              size={20} 
              color={activeTab === 'truthfulness' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 'truthfulness' ? colors.primary : colors.textSecondary }]}>
              Truthfulness
            </Text>
          </TouchableOpacity>
        </View>
      )}




      {/* Map View */}
      {activeTab === 'map' && articles.length > 0 && analysisComplete && (
        <>
          <TrendValueSelector
            selectedMode={trendValueMode}
            onModeChange={setTrendValueMode}
            isDark={isDark}
          />
          <MapView
            markers={articles.map(article => {
              // Find trend value at article publish date
              const articleDate = new Date(article.publishDate).toISOString().slice(0, 10);
              const trendAtPublish = trendTimeSeries.find(t => t.date === articleDate);
              const mainTrendValue = trendAtPublish?.value || 0;
              
              // Build trend terms from all phrases in trendMultiplePhrasesData
              const trendTerms = trendMultiplePhrasesData.map(phrase => ({
                term: phrase.phrase,
                value: phrase.data.find(d => d.date === articleDate)?.value || 0
              })).filter(t => t.value > 0);
              
              // Calculate trend value based on selected mode
              const allTermsValues = trendTerms.map(t => t.value);
              const trendValue = calculateTrendValue(mainTrendValue, allTermsValues);
              
              // Get sentiment label
              const sentimentLabel = article.sentiment ? getSentimentLabel(article.sentiment.score) : 'Unknown';
              
              return {
                id: article.id,
                title: article.title,
                latitude: article.latitude || 0,
                longitude: article.longitude || 0,
                status: article.status,
                color: getStatusColor(article.status),
                source: article.source,
                city: article.city,
                link: article.link,
                sentiment: article.sentiment,
                sentimentLabel: sentimentLabel,
                trendValue: trendValue,
                trendTerms: trendTerms,
                publishDate: articleDate
              };
            })}
            trendPolygons={[]}
            onMarkerPress={(marker) => {
              const article = articles.find(a => a.id === marker.id);
              if (article) setSelectedArticle(article);
            }}
            isDark={isDark}
          />
        </>
      )}

      {/* Analysis Loading State */}
      {activeTab === 'map' && articles.length > 0 && !analysisComplete && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 16 }}>
            Processing sentiment & trend data...
          </Text>
        </View>
      )}

      {/* Articles List */}
      {activeTab === 'list' && (
        <FlatList
          data={articles}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              onPress={() => setSelectedArticle(item)}
              style={[styles.articleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <MaterialCommunityIcons name={getStatusIcon(item.status)} size={16} color="white" />
              </View>
              <View style={styles.articleContent}>
                <Text style={[styles.articleTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.articleMeta, { color: colors.textSecondary }]}>
                  {item.source} • {item.city}
                </Text>
                <Text style={[styles.articleDate, { color: colors.textSecondary }]} numberOfLines={1}>
                  {new Date(item.publishDate).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}

      {/* Trends View */}
      {activeTab === 'trends' && articles.length > 0 && (trendTimeSeries.length > 0 || trendMultiplePhrasesData.length > 0) && (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ padding: 16 }}>
            <TrendGraphView
              trendLabels={useMemo(() => trendTimeSeries.length > 0 ? trendTimeSeries.map(p => p.date) : (trendMultiplePhrasesData[0]?.data.map(p => p.date) || []), [trendTimeSeries, trendMultiplePhrasesData])}
              trendData={useMemo(() => trendTimeSeries.length > 0 ? trendTimeSeries.map(p => p.value) : (trendMultiplePhrasesData[0]?.data.map(p => p.value) || []), [trendTimeSeries, trendMultiplePhrasesData])}
              multiPhraseTrendData={trendMultiplePhrasesData}
            />
          </View>
        </ScrollView>
      )}

      {/* Sentiment View */}
      {activeTab === 'sentiment' && articles.length > 0 && (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ padding: 16 }}>
            <SentimentGraphView
              sentimentPoints={useMemo(() => articles.map(a => ({
                date: new Date(a.publishDate).toLocaleDateString(),
                score: a.sentiment?.score ?? 0,
                source: a.source || '',
                keywordSentiment: extractArticleKeywords([a])[0]?.sentiment ?? 0
              })), [articles])}
            />
          </View>
        </ScrollView>
      )}

      {/* Source Bias View */}
      {activeTab === 'bias' && articles.length > 0 && (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ padding: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>
              Source Bias Ratings
            </Text>
            {articles.map((article, index) => {
              // Get bias from article (would need to be added to Article interface from backend)
              const bias = (article as any).bias !== undefined ? (article as any).bias : null;
              const biasLabel = bias === null ? 'Unknown' : bias < -5 ? 'Left-leaning' : bias > 5 ? 'Right-leaning' : 'Neutral';
              const biasColor = bias === null ? '#9ca3af' : bias < -10 ? '#1f2937' : bias < -5 ? '#6b7280' : bias > 10 ? '#374151' : bias > 5 ? '#6b7280' : '#3b82f6';
              
              return (
                <View key={index} style={[styles.articleCard, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 12 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.articleTitle, { color: colors.text, flex: 1 }]} numberOfLines={2}>
                      {article.source}
                    </Text>
                    <View style={{ backgroundColor: biasColor, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                        {bias !== null ? `${bias > 0 ? '+' : ''}${bias}` : 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.articleMeta, { color: colors.textSecondary }]}>
                    {biasLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Source Truthfulness View */}
      {activeTab === 'truthfulness' && articles.length > 0 && (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ padding: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>
              Source Factual Reporting Ratings
            </Text>
            {articles.map((article, index) => {
              const factualReporting = (article as any).factualReporting || 'Unknown';
              const truthColor = factualReporting === 'VERY_HIGH' ? '#10b981' : factualReporting === 'HIGH' ? '#3b82f6' : factualReporting === 'MIXED' ? '#f59e0b' : '#9ca3af';
              const truthLabel = factualReporting === 'VERY_HIGH' ? 'Very High' : factualReporting === 'HIGH' ? 'High' : factualReporting === 'MIXED' ? 'Mixed' : 'Unknown';
              
              return (
                <View key={index} style={[styles.articleCard, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 12 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.articleTitle, { color: colors.text, flex: 1 }]} numberOfLines={2}>
                      {article.source}
                    </Text>
                    <View style={{ backgroundColor: truthColor, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                        {truthLabel}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.articleMeta, { color: colors.textSecondary }]}>
                    {article.source}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Article Detail Modal */}
      <Modal
        visible={!!selectedArticle}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedArticle(null)}
      >
        {selectedArticle && (
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setSelectedArticle(null)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Article Details</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
                <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedArticle.status) }]}>
                  <Text style={styles.statusLabel}>{selectedArticle.status.toUpperCase()}</Text>
                </View>

                <Text style={[styles.detailTitle, { color: colors.text }]}>
                  {selectedArticle.title}
                </Text>

                <View style={styles.detailMeta}>
                  <Text style={[styles.detailMetaText, { color: colors.textSecondary }]}>
                    {selectedArticle.source}
                  </Text>
                  <Text style={[styles.detailMetaText, { color: colors.textSecondary }]}>
                    {new Date(selectedArticle.publishDate).toLocaleString()}
                  </Text>
                  <Text style={[styles.detailMetaText, { color: colors.textSecondary }]}>
                    By {selectedArticle.author}
                  </Text>
                  <Text style={[styles.detailMetaText, { color: colors.textSecondary }]}>
                    📍 {selectedArticle.city}
                  </Text>
                </View>

                <Text style={[styles.detailDescription, { color: colors.text }]}>
                  {selectedArticle.description}
                </Text>

                {/* Contradictions Section */}
                {selectedArticle.contradictions && selectedArticle.contradictions.length > 0 && (
                  <View style={[styles.contradictionsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.contradictionsTitle, { color: colors.text }]}>
                      🔄 Potential Contradictions ({selectedArticle.contradictions.length})
                    </Text>
                    {selectedArticle.contradictions.map((contradiction, idx) => (
                      <View key={idx} style={[styles.contradictionItem, { borderColor: colors.border }]}>
                        <Text style={[styles.contradictionType, { 
                          color: contradiction.claimType === 'refutes' ? '#FF6B6B' : '#4ECDC4' 
                        }]}>
                          {contradiction.claimType === 'refutes' ? '⚠️ Refuted by:' : '⟷ Related to:'}
                        </Text>
                        <Text style={[styles.contradictionTitle, { color: colors.text }]} numberOfLines={2}>
                          {contradiction.title}
                        </Text>
                        <Text style={[styles.contradictionConfidence, { color: colors.textSecondary }]}>
                          Confidence: {Math.round(contradiction.confidence)}%
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.readButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    // Open link (would use Linking.openURL in real implementation)
                    console.log('Opening:', selectedArticle.link);
                  }}
                >
                  <Text style={styles.readButtonText}>Read Full Article</Text>
                  <MaterialCommunityIcons name="open-in-new" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1
  },
  title: {
    fontSize: 24,
    fontWeight: '700'
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchContainer: {
    flexDirection: 'row',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  legendContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 60
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    gap: 6
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500'
  },
  summaryLegendContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxHeight: 40
  },
  summaryLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    gap: 4
  },
  summaryLegendLabel: {
    fontSize: 11,
    fontWeight: '600'
  },
  summaryLegendValue: {
    fontSize: 13,
    fontWeight: '700'
  },
  summaryContainer: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    minWidth: '18%',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  summaryCardValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryCardLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500'
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabActive: {
    borderBottomWidth: 2
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500'
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  articleCard: {
    flexDirection: 'row',
    padding: 12,
    marginVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 12
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  articleContent: {
    flex: 1,
    gap: 4
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '600'
  },
  articleMeta: {
    fontSize: 12
  },
  articleDate: {
    fontSize: 11
  },
  modalContainer: {
    flex: 1
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  modalContent: {
    flex: 1,
    padding: 12
  },
  detailSection: {
    padding: 16,
    borderRadius: 8,
    gap: 16
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  statusLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700'
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700'
  },
  detailMeta: {
    gap: 8
  },
  detailMetaText: {
    fontSize: 14
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 20
  },
  readButton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  readButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  trendControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12
  },
  trendControlLabel: {
    fontSize: 12,
    fontWeight: '600'
  },
  trendButton: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    gap: 6
  },
  trendButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  trendStatsCompact: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 'auto'
  },
  trendStatText: {
    fontSize: 11,
    fontWeight: '500'
  },
  contradictionsSection: {
    marginVertical: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B'
  },
  contradictionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12
  },
  contradictionItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4ECDC4',
    backgroundColor: 'rgba(78, 205, 196, 0.05)',
    borderRadius: 4
  },
  contradictionType: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4
  },
  contradictionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18
  },
  contradictionConfidence: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4
  }
});

