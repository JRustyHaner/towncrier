# Towncrier Ideation & Technical Blueprint

## 1. Purpose / Elevator Pitch
Visualize the geographic origin (source headquarters) and reported city of news articles matching user-entered search terms, highlighting article lifecycle events (original report, corrections, retractions) and temporal evolution. Provide insight into reliability through retraction/correction ratios and timeline dynamics.

## 2. Core User Flow
1. User enters one or more search terms in the search box.
2. Backend fetches news articles from the newsdata.io API using the provided API key and filters articles matching terms (define AND/OR semantics; default OR with phrase matching).
3. For each candidate article (up to user-selected limit 20–100):
   - Fetch and parse article HTML.
   - Extract text + metadata (title, author, publish date).
   - Derive reported city (first valid city mention; regex + gazetteer + optional NER service).
   - Classify status (original, correction, retraction) via keyword rules.
4. Determine source headquarters coordinates via Wikipedia / Wikidata lookup (cached).
5. Deduplicate articles (canonical URL/content hash).
6. Accumulate normalized records in memory for the duration of the search (not persisted).
7. Frontend displays a Leaflet map with switchable layers: Source HQ vs Reported City.
8. User uses timeline slider & filters (status, source, date range) to explore.
9. Retraction percentage + timeline graph displayed.

## 3. High-Level Architecture
Frontend: React + TypeScript + Leaflet.
Backend: Node.js (Express + TypeScript). Optional auxiliary Python microservice for advanced NLP (spaCy) if needed; start with pure Node.
Data Store: None (no persistent storage). Only transient in-memory state during an active request/page session; no Redis.
Containerization: Docker for all services; docker-compose for local orchestration.

```
[Browser]
   | REST/JSON (search, results, stats)
[Express API]
   |-- Newsdata.io Fetcher (async)
   |-- Article Parser (Cheerio / @postlight/parser)
   |-- Classification & City Extraction
   |-- Source HQ Resolver (Wikipedia/Wikidata)
   |-- Deduper
   |-- Transient State (in-memory per request)
   |-- No Persistent Storage (no DB/Redis)
```

## 4. Data Model (Proposed)
Entity: ArticleRecord
- id (UUID)
- search_id (UUID)
- search_terms (string[])
- source_name (string)
- source_api (string) // e.g., 'newsdata.io'
- article_url (string)
- canonical_url (string)
- title (string)
- author (string | null)
- published_at (Date ISO)
- fetched_at (Date ISO)
- status ("original" | "correction" | "retraction" | "inciting")
- reported_city (string | null)
- reported_city_lat (number | null)
- reported_city_lng (number | null)
- source_hq_lat (number | null)
- source_hq_lng (number | null)
- location_confidence (0–1 number)
- keywords_matched (string[])
- language ("en-US")
- paywall_detected (boolean)
- fetch_error (string | null)
- content_hash (string)
- dedup_key (string)
 - issue_tags (string[])  // e.g. ["lgbtq", "racism", "sexism", "misidentification"]
 - issue_tags_confidence (number | null) // aggregated confidence score

Entity: SearchSession
- id (UUID)
- created_at
- terms (string[])
- limit (number)
- and_logic (boolean)
- total_articles_processed (number)
- total_valid (number)
- retraction_count (number)
- correction_count (number)

## 5. Pipelines & Key Steps
1. Newsdata.io Fetch: Parallel API requests with rate limits & per-request timeout.
2. Filter Articles: Simple term matching (case-insensitive; whole word or phrase). Consider stemming minimal or none initially.
3. Article Fetch: HTTP GET with retries (exponential backoff), max body size, user-agent string.
4. Parse HTML: Cheerio or @postlight/parser for readable text. Strip scripts/styles/nav.
5. City Extraction:
   - Regex & US cities gazetteer (preloaded set for quick lookup).
   - Choose first city mention that resolves to a unique city (disambiguation by presence of state/country following). If ambiguous, skip or mark low confidence.
6. Status Classification:
   - Keyword lists (config file): retraction, correction triggers.
   - If no keywords matched, candidate for "original".
   - Mark earliest published article across session terms as "inciting" (blue).
7. Source HQ Lookup:
   - Query Wikipedia page for organization, extract Wikidata ID, fetch coordinates (P625). Cache long TTL (e.g., 30 days).
8. Deduplication:
   - Build canonical_url (strip tracking params) + content_hash(title + first 300 chars) to form dedup_key.
9. Aggregation (Transient):
   - Accumulate ArticleRecords in memory and compute summary metrics for the current run only; discard after response/session ends.
10. Response Shaping:
   - Map layer data returned as GeoJSON FeatureCollection for both HQ and City points.

## 6. Rate Limiting Strategy (No Persistent Counters)
- Global concurrency cap (e.g., max 5 simultaneous article fetches per search).
- Per-domain rate (e.g., 1 request / second per source domain) to avoid bans.
- Token bucket (in-process) for API endpoints: approximate limits per instance (resets on restart).
- Wikipedia / Wikidata: obey usage guidelines; backoff on 429.
- No Redis sliding window; optional in-memory counters only (best effort, non-authoritative).

**newsdata.io Free API Credit Limitation:**
- The free newsdata.io API plan allows up to 200 daily credits. Each API call consumes one credit.
- The backend tracks the number of API calls made per day and will not exceed 200 requests in a 24-hour period.
- If the daily quota is reached, further searches will be rejected with an informative error message until the quota resets.
- Usage count is tracked in-memory and/or via persistent storage if available, and is reset at midnight UTC.

## 7. Caching Strategy (Ephemeral Only)
- No cross-request or cross-session caching.
- Optional micro-caches scoped strictly to a single in-flight search (e.g., de-duplicate within the same run).
- Conditional requests: respect API rate limits and pagination to reduce bandwidth and avoid quota exhaustion.

## 8. Error Handling & Resilience
Error taxonomy:
- API_FETCH_FAILED
- ARTICLE_FETCH_TIMEOUT / PAYWALL / FORBIDDEN / NOT_FOUND
- PARSE_FAILED
- CITY_NOT_FOUND
- HQ_LOOKUP_FAILED

Principles:
- Fail soft: include partial dataset; record fetch_error per article.
- Circuit breaker: if repeated failures for a domain exceed threshold, pause further fetches in session.
- Timeouts: API (5s), Article (8s), Wikipedia (4s).
- Retries: 2 attempts with exponential backoff base 300ms.
- User feedback: UI badges for error states; tooltip details.

## 9. Map & Visualization Features
Leaflet Map:
- Marker Clustering: cluster both HQ and city layers separately (using Leaflet.markercluster or supercluster).
- Color Coding:
  - Red: retraction
  - Yellow: correction
  - Green: original
  - Blue outline: inciting article
- Legend component (colors + counts + percentages).
- Toggle Layer Control: Source HQ vs Reported City (exclusive or overlay mode).
- Filters:
  - Status (multi-select checkboxes)
  - Source name(s)
  - Date range / Timeline slider (range selection across published_at).
  - Confidence threshold slider for location_confidence.
    - Issue tags (multi-select: LGBTQ, racism, sexism, misidentification)
- Timeline Slider:
  - Linked brushing: adjusting slider refilters points & timeline histogram.
  - Histogram / sparkline showing article counts by hour/day.
- Accessibility:
  - Distinct shapes/icons in addition to colors for color-blind users.

### Issue / Topic Classification & Filters
Goal: Allow users to focus on articles referencing sensitive or socially significant issues (LGBTQ communities, racism, sexism, misidentification of involved parties).

Approach:
1. Keyword Gazetteers per category (config JSON/YAML) with weighted phrases.
2. Context Window: Scan normalized article text (lowercased, punctuation stripped) limited to first N chars (e.g., 8000) for performance.
3. Multi-Phrase Matching: Count unique matches per category; compute confidence = sigmoid(weighted_sum / length_factor).
4. Negation Handling: Simple heuristic (e.g., if "not" within 3 tokens before keyword, reduce weight) to lower false positives.
5. Misidentification Detection: Look for patterns like "mistaken identity", "wrongly identified", "incorrectly named", and updates indicating correction of parties involved.
6. Tag Assignment: Include category only if confidence >= ISSUE_CONF_THRESHOLD (default 0.4) or explicit high-weight phrase matched.
7. Logging: Emit structured log with issue_tags and confidence for audit.

Data Ethics & Caution:
- Categories are heuristic; clearly label in UI as "Detected topic (possible)".
- Provide user opt-in to show/hide issue tags.
- Avoid implying definitive characterization; these are textual mentions, not judgments.

False Positive Mitigation:
- Maintain stoplist phrases that commonly produce noise.
- Periodic review of tagged samples.
- Allow manual toggle OFF for issue filtering feature via feature flag ENABLE_ISSUE_TAGS.

Extensibility:
- Additional categories (e.g., environmental, health, legal) can be added by extending config without code changes.

## 10. Logging & Observability (Structured Logs)
- Use pino or winston with JSON output.
- Log schema includes: timestamp, level, msg, search_id, article_url, phase (API_FETCH|PARSE|CLASSIFY), duration_ms, error_code.
- Aggregate metrics: success rate per phase, average fetch duration, retraction/correction ratios.
- Expose /api/health & /api/metrics (Prometheus format) for container monitoring.
- Enable trace IDs (search_id reused) for correlation.
 - Issue tagging metrics: counts per issue category, confidence distribution histogram.

## 11. Security & Safety Considerations
- Input sanitation for search terms (length cap, allowed chars).
- Prevent SSRF: restrict article fetching to domains returned by the newsdata.io API.
- Respect robots.txt for article pages if accessible before crawl (optional optimization pass).
- Limit max HTML size (e.g., 1.5MB) to avoid memory pressure.
- Remove script/style tags before regex scanning.

## 12. Docker Deployment
Images:
- api: Node 20-alpine, multi-stage build (install -> build -> prod runtime) with non-root user.
- Optional nlp: Python slim (if spaCy added later).
- frontend: Node build -> static assets served via lightweight nginx or Express static.

docker-compose (dev): services (frontend, api), shared network.
Environment:
- CONFIG via .env (rate limits, cache TTLs, feature flags).
- Healthcheck commands for api & frontend.
- Resource limits (CPU/mem) for api container.
Logging:
- Direct structured logs to stdout; orchestrator aggregates.

## 13. Configuration & Feature Flags
- ENABLE_NLP (boolean) to toggle advanced city detection.
- LOCATION_CONF_THRESHOLD default 0.5.
- ENABLE_SOURCE_LAYER (boolean).
- RETRY_LIMIT adjustable.
- API source and parameters configurable via environment variables or config file.
 - ENABLE_ISSUE_TAGS (boolean) master flag for issue classification.
 - ISSUE_CONF_THRESHOLD (number) default 0.4.

## 14. Testing Strategy
- Unit: term matching, keyword classification, city regex.
- Integration: end-to-end search pipeline with mocked newsdata.io API responses.
- Snapshot: GeoJSON output shape.
- Performance: ensure search 50 articles completes < N seconds (define target, e.g., 6s median).
- Chaos: simulate API timeouts.
 - Issue Tagging: unit tests for keyword matching, negation handling, confidence scoring; integration tests ensuring tags appear only with threshold met; false positive regression set.

## 15. Metrics & KPIs
- Average search latency.
- % articles with city resolved.
- Retraction/Correction ratio per source.
- Error rate per phase.
- Cache hit rate (HQ lookups).
 - Issue tag coverage (% of articles with >=1 issue tag).
 - False positive rate estimate (manual review sample size; target <10%).
 - Distribution of issue categories per source.

## 16. Open Questions
- AND vs OR multi-term search default? (Current: OR).
- City ambiguity resolution beyond first mention (frequency vs first?).
- Should multiple cities produce multiple points or just first? (Current: first only.)
- Data retention policy for searches (TTL?).
- Inciting article definition across multi-term sets (tie-break by earliest published_at; if identical, lexicographic URL?).
 - Should issue tagging be disabled by default for performance/privacy?
 - Provide user editing/feedback loop to improve tag accuracy?
 - How to internationalize issue keyword sets if expanding beyond en-US?

## 19. Technical Implementation Details ("How")

### Module / Folder Structure (Proposed)
```
server/
   src/
      index.ts                # Express bootstrap
      config.ts               # Env + feature flags loader
      logger.ts               # Pino logger setup
      routes/
         search.ts             # /api/search
         results.ts            # /api/search/:id/results
         stats.ts              # /api/stats/:id, /api/legend
         health.ts             # /api/health
         metrics.ts            # /api/metrics (Prometheus)
      services/
         newsFetcher.ts         # Fetch & filter newsdata.io API
         articleFetcher.ts     # HTTP fetch with retries
         parser.ts             # HTML -> text extraction
         cityExtractor.ts      # City detection logic
         hqResolver.ts         # Wikipedia/Wikidata HQ lookup
         issueTagger.ts        # Topic classification
         classifier.ts         # Retraction/Correction/Inciting status
         deduper.ts            # Dedup strategy
         rateLimiter.ts        # Token bucket / sliding window
         cache.ts              # Abstractions (Redis + in-memory)
      models/
         ArticleRecord.ts
         SearchSession.ts
      db/
         schema.sql            # Migrations (if using SQL)
      util/
         time.ts               # Timezone normalization
         geojson.ts            # ArticleRecord -> GeoJSON
         hash.ts               # Content hash helpers
      workers/
         pipelineWorker.ts     # Orchestrates pipeline per search
   test/
      unit/
      integration/
   Dockerfile
frontend/
   src/...                   # React app
```

### Concurrency Model (Transient Tasks)
- Each search spawns a lightweight pipeline task (Promise chain or queue worker).
- Use a bounded concurrency semaphore (e.g., p-limit) for article fetches (max 5 at once).
- Rate limiting enforced per domain before fetch dispatch.
- No Redis. Use single-instance in-memory coordination only.

### Data Retention
- No data is retained after the response/session completes. No databases and no long-lived caches.

### Timezone Handling
- Store all timestamps UTC internally.
- Convert published_at to user's timezone (derived from browser or profile) at response shaping phase.

### Configuration Loading
- Dotenv -> validation via zod schema; missing required values cause startup fail.
- Feature flags exposed in /api/health for introspection (non-sensitive only).

### GeoJSON Response Shape (Excerpt)
```json
{
   "type": "FeatureCollection",
   "features": [
      {
         "type": "Feature",
         "geometry": { "type": "Point", "coordinates": [-73.987, 40.753] },
         "properties": {
            "id": "uuid",
            "source": "NYT",
            "status": "retraction",
            "city": "New York",
            "published_at": "2025-11-09T12:34:00Z",
            "issue_tags": ["racism"],
            "issue_confidence": 0.78
         }
      }
   ]
}
```

### Rate Limiting Implementation
Token Bucket (per IP + endpoint):
- Redis keys: `rl:{ip}:{endpoint}` storing `tokens` and `last_refill_ts`.
- Refill interval: 1s; capacity: e.g., search=5 tokens; cost: 1 token per request.
Sliding Window (approximate, in-process):
- Maintain per-process arrays of timestamps; resets on restart; not authoritative across instances.
On exceed: respond 429 with `Retry-After` header.

### Caching Keys
- None persisted. Any de-duplication or lookups happen within the memory scope of the active request only.

### Deduplication Strategy
1. Normalize URL (strip UTM params, lowercase host).
2. Compute `content_hash = sha256(title + first_300_chars(text))`.
3. If `canonical_url` already seen OR `content_hash` collision -> mark duplicate (skip insert, increment duplicate counter).
4. Maintain simple in-memory Set for high-speed duplicate detection during the active search run (no persistent confirmation).

### Error Handling Middleware (Express)
```ts
app.use((err, req, res, next) => {
   logger.error({ err, path: req.path }, 'request_failed');
   const status = err.httpStatus || 500;
   res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.publicMessage || 'Unexpected error' });
});
```

### Pipeline Orchestrator (Pseudocode)
```ts
async function runSearchPipeline(searchId, terms, limit) {
   const articles = await fetchNewsdataArticles();
   const candidates = filterByTerms(articles, terms, limit * 2); // oversample before dedup
   const unique = dedupe(candidates).slice(0, limit);
   const earliest = findEarliest(unique);
   await Promise.all(unique.map(a => processArticle(a, earliest)));
   return buildGeoJSON(unique);
}
```

`processArticle` steps:
1. Fetch HTML (timeout, retries).
2. Parse -> text.
3. Extract city (regex gazetteer + optional NER).
4. Classify status (keywords + earliest logic).
5. Tag issues (keyword weights, confidence).
6. Resolve HQ from cache or Wikipedia.
7. Persist ArticleRecord.

### City Extraction Algorithm
1. Preload gazetteer Map: cityName -> {state, lat, lng, population}.
2. Regex tokenization; scan text sequentially.
3. On match, check following tokens for state/US abbreviation to disambiguate.
4. If multiple candidates: choose first with disambiguation; else first occurrence overall.
5. Confidence:
    - +0.4 if state follows
    - +0.2 if population > 100k
    - -0.3 if appears in non-content (header/footer heuristics)
    - Clamp 0–1.

### Issue Tagging Algorithm
1. Normalize text: lowercase, strip diacritics, collapse whitespace.
2. For each category, iterate weighted phrase list.
3. When phrase found, accumulate `score += weight * (1 - distancePenalty)`.
4. Negation: if "not" within 3 tokens before phrase, `score *= 0.5`.
5. Confidence = `sigmoid(score / 10)`.
6. Tag if `confidence >= ISSUE_CONF_THRESHOLD` OR any phrase weight >= hard threshold (e.g., 5).
7. Aggregate `issue_tags_confidence` = max(category confidences).

### Status Classification Algorithm
1. If article matches retraction phrases -> status `retraction`.
2. Else if correction phrases -> `correction`.
3. Else if article == earliest -> `inciting`.
4. Else -> `original`.

### Performance Targets
- P95 search (50 articles) < 6s.
- Article fetch timeout 8s; typical parse < 300ms.
- Memory footprint per search < 10MB transient.
- Duplicate detection false negative rate < 2% (manual sampling).

### Observability Metrics (Prometheus Examples)
- `towncrier_search_duration_seconds{status="ok"}` histogram.
- `towncrier_article_fetch_fail_total{error_code="TIMEOUT"}` counter.
- `towncrier_issue_tag_count{tag="racism"}` counter (process lifetime only).
- `towncrier_city_confidence_bucket{le="0.5"}` histogram.

### Security Measures
- Only fetch articles and content from URLs provided by the newsdata.io API.
- Strip HTML potentially malicious content; disallow inline event handlers.
- Rate limit per IP; identify abuse patterns (excessive searches) and temporarily ban.

### Deployment (Docker) Enhancements
- Multi-stage build uses `npm ci` for deterministic installs.
- Healthcheck: `CMD curl -f http://localhost:3000/api/health || exit 1`.
- Non-root user `node` with proper file permissions.
- Resource limits example: `deploy.resources.limits.memory: 512M`.

## 20. API Contracts (Draft)
### POST /api/search
Request:
```json
{ "terms": ["oil", "spill"], "limit": 40, "and_logic": false }
```
Response 202 (async start):
```json
{ "search_id": "uuid", "status": "processing" }
```
### GET /api/search/:id/results
Response 200:
```json
{ "search_id": "uuid", "ready": true, "geojson": { /* FeatureCollection */ }, "summary": {"total": 37, "retractions": 2, "corrections": 5} }
```
### GET /api/stats/:id
```json
{ "search_id": "uuid", "timeline": [{"bucket":"2025-11-09T12:00Z","count":5}], "issue_tags_distribution": {"racism":3,"lgbtq":1}, "retraction_ratio": 0.054 }
```
### GET /api/legend
```json
{ "statuses": {"retraction":"#ff3333","correction":"#ffd633","original":"#33aa33","inciting":"#3366ff"}, "issue_tags": {"racism":"#8b0000","lgbtq":"#b833ff","sexism":"#ff66aa","misidentification":"#ff9966"} }
```
### GET /api/health
```json
{ "ok": true, "features": {"ENABLE_ISSUE_TAGS": true} }
```
### GET /api/metrics
Prometheus text format.

Error Format (all endpoints):
```json
{ "error": "RATE_LIMIT", "message": "Too many requests" }
```

## 21. Algorithms & Pseudocode (Additional)
### Token Bucket (RateLimiter)
```ts
class TokenBucket {
   constructor(capacity, refillRatePerSec) { /* ... */ }
   tryConsume(n=1) { /* return true/false */ }
}
```
### Sliding Window (In-Process Approximation)
```ts
function allowActionLocal(state, key, now=Date.now()) {
   const windowMs = 3600000;
   const arr = (state[key] ||= []);
   while (arr.length && arr[0] < now - windowMs) arr.shift();
   if (arr.length >= MAX) return false;
   arr.push(now);
   return true;
}
```
### Bloom Filter initialization
```ts
const bloom = new BloomFilter(10_000, 4); // approximate settings
```

## 22. Resolved Decisions
- Multi-term search: default OR; provide advanced AND via `and_logic=true`.
- City selection: first disambiguated occurrence; do not map multiple cities initially.
- Retention: None (all transient).
- Inciting article: earliest published_at among valid originals; tie-break lexicographic canonical_url.
- Issue tagging: enabled by default; user can hide via UI toggle; can be globally disabled with flag.
- Feedback loop: future endpoint to submit false positive/negative; backlog item.
- Internationalization: out of scope initial release (English only); structure config for future locale extension.


## 17. Next Steps (Initial Implementation Path)
1. Scaffold Express + TypeScript project structure.
2. Implement /api/search (stub) and mock response.
3. Add newsdata.io API fetch + term filter + dedup core.
4. Add city extraction (regex + gazetteer) minimal subset.
5. Add classification keywords + earliest article logic.
6. Return GeoJSON for map; build React map w/ Leaflet + clustering.
7. Introduce caching & rate limiting (simple in-memory) + structured logging.
8. Add error taxonomy handling & surface to UI.
9. Add timeline slider & filters.
10. Dockerize and compose basic stack.

## 18. Original Requirements (Preserved)
- Map display
- Search box triggers newsdata.io API search
- Toggle between source location & article city
- Wikipedia API for HQ
- Scrape city from article
- Uses newsdata.io API as news source
- Timeline filtering
- Keyword detection for retractions/corrections
- Color-coded nodes (red/yellow/green/blue)
- React frontend, TypeScript, Express backend
- Fields: source, title, date published, date accessed, reportedcity, sourcelocation, type
- Original article = first reported
- Simple regex for reported city; choose first
- User timezone normalization
- Leaflet
- Max articles slider 20–100
- Graceful failures (RSS/paywall/Wikipedia)
- English US only
- Remove duplicate articles
- Retraction percentage graph
- Timeline view

---
This document now encompasses added sections for rate limiting, caching, error handling, marker clustering, timeline sliders, filters, structured logs, and Docker deployment.
