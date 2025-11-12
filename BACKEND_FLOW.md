# Towncrier Backend Flow Documentation

## Overview
The Towncrier backend is an Express.js server that processes news articles, analyzes them for misinformation signals, and returns georeferenced data with sentiment analysis and media bias ratings. It uses a hybrid approach combining multiple data sources and ML models.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    HTTP/REST API
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   Express.js Backend Server                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     Router Layer                           │ │
│  │  • /api/search (POST) - Main search endpoint              │ │
│  │  • /api/search/:id/results (GET) - Get results            │ │
│  │  • /api/health - Server health check                      │ │
│  │  • /api/legend - UI legend data                           │ │
│  │  • /api/sources - Available news sources                  │ │
│  │  • /api/trends/* - Google Trends analysis                │ │
│  │  • /api/serp/* - SERP analysis                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                      │
│  ┌────────────────────────▼───────────────────────────────────┐ │
│  │                   Service Layer                            │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │            HybridFetcher                             │ │ │
│  │  │  • Combines NewsData.io & Google News               │ │ │
│  │  │  • Fetches retractions & corrections                │ │ │
│  │  │  • Deduplicates results                             │ │ │
│  │  │  • Timeout handling & fallback mechanism            │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                           │                                 │ │
│  │  ┌────────────┬──────────┬┴───────────┬──────────┬────┐    │ │
│  │  │            │          │            │          │    │    │ │
│  │  ▼            ▼          ▼            ▼          ▼    ▼    │ │
│  │ NewsData   Google      Article     City      Sentiment  Bias│ │
│  │ Fetcher    News        Text       Extractor  Analyzer  Lookup│
│  │          Scraper      Extractor                             │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │            StatusClassifier                          │ │ │
│  │  │  • Detects: Retractions, Corrections, etc.          │ │ │
│  │  │  • Uses misinformation signals & ML models          │ │ │
│  │  │  • Incorporates media bias data                     │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │            Google Trends Service                     │ │ │
│  │  │  • Fetches trend data via DataForSEO or Puppeteer  │ │ │
│  │  │  • Generates trend polygons for visualization       │ │ │
│  │  │  • Analyzes trend phases & comparisons              │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │            Jaccard Similarity Filter                 │ │ │
│  │  │  • Removes off-topic noise                          │ │ │
│  │  │  • Keeps articles with word overlap                 │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                           │
                      GeoJSON Output
                    (Features + Properties)
                           │
                      ┌────▼────┐
                      │ Frontend │
                      │   Map    │
                      └──────────┘
```

---

## Main Search Flow

### 1. **Search Endpoint** (`POST /api/search`)

**Input:**
```json
{
  "terms": ["keyword1", "keyword2", ...],
  "limit": 100,
  "sources": ["optional", "source", "ids"]
}
```

**Process:**
- Generate unique search ID
- Return 202 ACCEPTED immediately
- Process search asynchronously in background

---

### 2. **Article Fetching Phase**

#### Step 2.1: Hybrid Fetch
```
HybridFetcher.fetchArticles()
    ↓
    ├─→ Expand search terms:
    │   ├─ Original: ["climate change"]
    │   ├─ Retractions: ["retraction", "climate change"]
    │   └─ Corrections: ["correction", "climate change"]
    │
    ├─→ For each term set, fetch from BOTH in parallel:
    │   ├─→ NewsData.io API
    │   │   ├─ Timeout: 8 seconds
    │   │   ├─ Fallback: empty array
    │   │   └─ Returns: Title, Description, Link, Source, etc.
    │   │
    │   └─→ Google News Scraper
    │       ├─ Timeout: 10 seconds
    │       ├─ Fallback: empty array
    │       └─ Returns: Similar structure
    │
    ├─→ Combine & Deduplicate
    │   └─ Remove exact duplicates
    │
    └─→ Result: Array of HybridArticles
```

#### Step 2.2: Jaccard Similarity Filtering
```
Filter articles that share at least 1 word with other articles
    ├─ Removes completely off-topic noise
    ├─ Keeps thematically related content
    └─ Example: 100 articles → 85 articles (relevant)
```

---

### 3. **Content Enrichment Phase**

#### Step 3.1: Article Text Extraction
```
For each article:
    ├─ Check if content exists
    ├─ If missing:
    │   └─ Scrape from article.link using headless browser
    │      (Uses node-readability or similar)
    │
    └─ Result: Full article content for analysis
```

#### Step 3.2: Media Bias Lookup
```
For each article:
    ├─ Load media-bias.csv (if not cached)
    │   └─ Parsed into cache: domain → BiasRating
    │
    ├─ Look up by source name (primary)
    │   ├─ Exact match: "BBC News"
    │   ├─ Short name: "BBC"
    │   └─ Fuzzy match: partial name matching
    │
    ├─ Fallback: Look up by domain from article URL
    │   └─ Extract domain & match against cache
    │
    └─ Result:
        ├─ bias: -30 to +30 (-30 = liberal/left, +30 = conservative/right)
        └─ factualReporting: "MIXED" | "HIGH" | "VERY_HIGH"
        
        💻 Console Output:
        ✓ Media Bias Lookup - Source: "BBC News" | Bias: -5 | Factual Reporting: VERY_HIGH
```

#### Step 3.3: City Extraction
```
For each article:
    ├─ Input: title + description
    ├─ Extract primary geographic location
    ├─ Return: {
    │   name: string,
    │   latitude: number,
    │   longitude: number,
    │   confidence: 0-1
    │ }
    └─ Used for: Geovisualization on map
```

---

### 4. **Analysis Phase**

#### Step 4.1: Status Classification
```
classifyStatus(title + description + content, biasRating, factualReporting)
    │
    ├─ Detect signals using ML models & keyword matching:
    │   ├─ Retraction signals: "retract", "withdrawn", "removed", etc.
    │   ├─ Correction signals: "correction", "amended", "erratum", etc.
    │   ├─ Biased signals: Inflammatory language, extreme bias indicators
    │   └─ Misinformation signals: Falsehood patterns, dubious claims
    │
    ├─ Classify into categories:
    │   ├─ "retraction" → Red circle
    │   ├─ "correction" → Orange square
    │   ├─ "news-article" → Green triangle
    │   ├─ "biased-source" → Purple hexagon
    │   └─ "untruthful-source" → Pink diamond
    │
    └─ Result: {
        status: string,
        confidence: 0-1,
        reason: string,
        signals: string[]
      }
```

#### Step 4.2: Sentiment Analysis
```
sentiment.analyze(title + description + content)
    │
    ├─ Run sentiment NLP analysis
    │
    └─ Result: {
        score: -N to +N,           // Absolute sentiment score
        comparative: -1 to 1,       // Normalized score
        sentimentLabel: "positive" | "negative" | "neutral"
      }

Valence Calculation:
    └─ valence = Math.max(-1, Math.min(1, comparative * 2))
       └─ Used for: Marker color gradient on map
           ├─ Red (-1): Most negative
           ├─ Gray (0): Neutral
           └─ Blue (+1): Most positive
```

#### Step 4.3: GeoJSON Feature Creation
```
For each article, create Feature:
{
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  properties: {
    id: string,
    title: string,
    author: string,
    source: string,
    publishDate: ISO8601,
    link: URL,
    description: string,
    status: classification status,
    statusConfidence: 0-1,
    statusReason: string,
    detectedSignals: [...],
    city: string,
    confidence: 0-1 (city extraction confidence),
    sentiment: { score, comparative },
    sentimentLabel: string,
    valence: -1 to 1 (for color gradient),
    category: string,
    bias: -30 to 30 (optional),
    factualReporting: string (optional),
    firstArticleTime: timestamp (for animation)
  }
}
```

---

### 5. **Aggregation & Analytics Phase**

#### Step 5.1: Summary Statistics
```
Count across all articles:
    ├─ total: All articles processed
    ├─ retractions: Count by status
    ├─ corrections: Count by status
    ├─ newsArticles: Count by status
    ├─ biasedSources: Count by status
    └─ untruthfulSources: Count by status
```

#### Step 5.2: Misinformation Metrics
```
analyzeMisinformationMetrics(all_classifications):
    │
    ├─ High Confidence Incidents
    │   └─ Count where confidence > threshold
    │
    ├─ Potential Misinformation
    │   └─ Count where multiple signals detected
    │
    ├─ Misdirected Content
    │   └─ Count where location confidence is low
    │
    └─ Top Signals
        └─ Most common misinformation indicators detected
           Example: [["fake news", 12], ["altered", 8], ...]
```

---

### 6. **Response Phase**

#### Step 6.1: Store in Cache
```
activeSearches[search_id] = {
  id: string,
  terms: string[],
  createdAt: timestamp,
  status: "complete",
  geojson: FeatureCollection,      // All features
  summary: SummaryStats,            // Aggregated counts
  misinformationMetrics: Metrics,  // Analytics
  sentimentScores: [...]            // Per-article sentiment
}
```

#### Step 6.2: Retrieve Results
```
GET /api/search/:id/results

Response:
{
  search_id: string,
  ready: boolean,
  geojson: {
    type: "FeatureCollection",
    features: [...]
  },
  summary: {
    total: number,
    retractions: number,
    corrections: number,
    newsArticles: number,
    biasedSources: number,
    untruthfulSources: number
  },
  misinformationMetrics: {
    highConfidenceIncidents: number,
    potentialMisinformation: number,
    misdirectedContent: number,
    topSignals: [[string, number], ...]
  }
}
```

---

## Service Details

### **HybridFetcher**
- **Purpose**: Combine multiple news sources for comprehensive coverage
- **Sources**: 
  - NewsData.io API (official data)
  - Google News Scraper (web scraping)
- **Features**:
  - Automatic fallback if one source fails
  - Search expansion for retractions/corrections
  - Deduplication of results
  - Timeout handling

### **StatusClassifier**
- **Purpose**: Categorize articles and detect misinformation
- **Categories**: retraction, correction, news-article, biased-source, untruthful-source
- **Detects**: 
  - Formal retractions
  - Corrections and amendments
  - Biased language patterns
  - Common misinformation indicators
  - Factual inconsistencies

### **MediaBiasLookup**
- **Data Source**: `server/data/media-bias.csv`
- **Matching Strategy**:
  1. Try source name (best for Google News)
  2. Try domain extraction
  3. Try partial matches
- **Output**: Bias rating (-30 to +30) + Factual reporting score
- **Console Output**: Logs each match found

### **CityExtractor**
- **Purpose**: Extract geographic location from article text
- **Returns**: City name + coordinates + confidence score
- **Used For**: Geovisualization on map

### **Sentiment Analysis**
- **Library**: `sentiment` npm package
- **Input**: Full article text
- **Output**: Sentiment score + comparative rating
- **Used For**: 
  - Marker color gradient (red = negative, blue = positive)
  - Trend analysis
  - Misinformation patterns

### **Jaccard Similarity**
- **Purpose**: Filter out off-topic noise
- **Threshold**: At least 1 word overlap
- **Result**: Removes completely unrelated articles while keeping thematic variations

### **Google Trends Service**
- **Purpose**: Analyze trends related to search terms
- **Data Sources**: 
  - DataForSEO API
  - Puppeteer web scraping
- **Outputs**:
  - Trend data over time
  - State-level trend polygons
  - Trend comparisons

---

## Data Flow Diagram

```
User Input (Search Terms)
        ↓
[POST /api/search] → Return search_id (202 ACCEPTED)
        ↓
HybridFetcher (NewsData + Google News)
        ↓
Deduplicate
        ↓
Jaccard Similarity Filter
        ↓
Extract Article Content
        ↓
[Parallel Processing for each article]
├─→ CityExtractor
├─→ MediaBiasLookup (CSV) → 💻 Console Log
├─→ StatusClassifier
├─→ Sentiment Analysis
└─→ Create GeoJSON Feature
        ↓
Aggregate Statistics
        ↓
Calculate Misinformation Metrics
        ↓
Store in Cache (activeSearches)
        ↓
[GET /api/search/:id/results] → Return FeatureCollection + Analytics
```

---

## Performance Considerations

1. **Parallel Processing**: Articles processed in parallel for speed
2. **Async/Await**: Non-blocking I/O for API calls and web scraping
3. **In-Memory Cache**: Search results stored in process memory (not persisted)
4. **Timeouts**: 
   - NewsData.io: 8 seconds
   - Google News: 10 seconds
   - Falls back gracefully on timeout
5. **Streaming**: Content extraction happens in parallel, not sequential

---

## Error Handling

```
Search Endpoint
├─ Network errors → Fallback sources, return partial results
├─ Timeout errors → Use cached data or empty results
├─ Parsing errors → Skip malformed articles
├─ Missing content → Attempt web scraping, skip if fails
└─ Database errors → Return empty collection
```

---

## Console Output Examples

```
✓ Loaded media bias data for 427 sources from local CSV
✓ Media Bias Lookup - Source: "CNN" | Bias: -15 | Factual Reporting: HIGH
✓ Media Bias Lookup - Source: "Fox News" | Bias: 20 | Factual Reporting: MIXED
[Search] Jaccard filter: 100 → 85 articles
[Search] Word overlap stats - Mean: 12.34 words, Min: 1, Max: 45
```

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/search` | Start new search (async) |
| GET | `/api/search/:id/results` | Get search results |
| GET | `/api/health` | Server health check |
| GET | `/api/legend` | UI legend configuration |
| GET | `/api/sources` | Available news sources |
| GET | `/api/trends/*` | Google Trends analysis |
| GET | `/api/serp/*` | SERP analysis |

---

## Database/Storage

- **Primary**: In-memory (process-specific)
- **CSV Data**: `server/data/media-bias.csv` (static, cached on load)
- **Persistence**: None (results lost on server restart)
- **Cache**: Search results expire after process restart

---

## Future Improvements

1. **Database Integration**: Persist search results to PostgreSQL/MongoDB
2. **Caching**: Redis for distributed caching
3. **Rate Limiting**: Implement API rate limits
4. **Authentication**: Add API key authentication
5. **Analytics**: Track popular searches and trends
6. **ML Models**: Fine-tuned models for better classification
7. **Real-time Updates**: WebSocket support for live results
8. **Source Expansion**: Add more news APIs and data sources
