# Towncrier Phased Development Plan

Target: MVP launch with demonstrator first, then flesh out core features, then polish.

## Phase 0: Demonstrator (Week 1–2)
**Goal:** Prove proof-of-concept; show map, basic search, mock articles.

### Deliverables
- Backend returns fake GeoJSON with 5–10 mock articles (hand-coded).
- Frontend displays map with markers; tappable to show detail.
- Search input wired (accepts terms, triggers backend call).
- Stateless: no persistence; reload clears data.

### Tasks
1. **Backend (2–3 days)**
   - Mock RSS fetcher returning static feed of articles.
   - City extraction stub (use fake lat/lng).
   - Status classifier stub (mark as "original" or "retraction").
   - POST /api/search returns mock GeoJSON immediately (no async yet).
   - GET /api/legend returns color map.

2. **Frontend (2–3 days)**
   - React Native base screen with search input and bottom tab.
   - Leaflet-style map view (use react-native-maps or web view).
   - Tap marker → show article detail in bottom sheet.
   - Fetch backend search, render markers from GeoJSON.
   - Material Design Icons integration for symbols.

3. **Styling**
   - Apply STYLEGUIDE.md colors and spacing.
   - Implement marker colors (red, yellow, green, blue outline).
   - Dark mode toggle (hardcoded for now).

### Acceptance Criteria
- [ ] Backend starts; `/api/health` returns `{ ok: true }`.
- [ ] `/api/search` with terms returns GeoJSON with ≥5 features.
- [ ] Frontend loads, displays map with markers.
- [ ] Tapping marker shows title, source, date in detail view.
- [ ] Search input → backend call → map updates.
- [ ] No data persists after reload/back navigation.

---

## Phase 1: MVP Core (Week 3–5)
**Goal:** Full MVP feature set per user stories Must-Have list.

### Deliverables
- Real RSS fetching (subset of predefined feeds).
- City extraction (regex + gazetteer, ~50% accuracy acceptable).
- Status classification (keyword rules).
- Timeline slider (date range filter).
- Retraction/correction ratio metrics.
- Progress indicator while searching.
- Error visibility (failed articles, network errors).
- Issue tag display (basic keyword detection).

### Tasks
1. **Backend (5–7 days)**
   - RSS Fetcher service
     - Fetch NYT, Washington Post, Reuters, BBC RSS feeds.
     - Parse articles: title, author, publish date, link.
     - Rate limit: 1 req/sec per domain.
   - City Extraction
     - Load gazetteer (US cities only).
     - Regex tokenize article text.
     - Extract first city mention; set confidence.
   - Status Classifier
     - Keyword lists (retraction/correction).
     - Mark earliest article as "inciting".
   - Deduplication
     - In-memory Set per search (canonical URL + content hash).
   - Search Pipeline Orchestrator
     - Async pipeline: fetch → parse → classify → accumulate.
     - Return GeoJSON with all fields (status, city, confidence, issue_tags).
   - Metrics Aggregation
     - Session summary: total, retractions, corrections, errors.

2. **Frontend (5–7 days)**
   - Map Improvements
     - Marker clustering (supercluster or Leaflet.markercluster).
     - Layer toggle (HQ vs Reported City).
     - Legend with counts & percentages.
   - Timeline & Filters
     - Timeline slider (date range).
     - Filter checkboxes (Status, Source, Topic).
     - Reset filters button.
   - Detail Panel Enhancements
     - Timeline of events (initial → correction → retraction).
     - Links to original article & related coverage.
     - Issue tag badges.
   - Progress & Loading
     - Progress bar during search.
     - Loading skeletons for map/timeline.
     - Empty state when no results.
   - Accessibility
     - Keyboard navigation (Tab, Enter, Escape).
     - ARIA labels for buttons/sliders.
     - Color-blind marker shapes (circle, square, triangle).

3. **Infrastructure**
   - Docker Compose updated for hot reload (volumes).
   - Health check endpoint.
   - Basic structured logging (console for now).

### Acceptance Criteria
- [ ] Must-Have stories 1–18 implemented (see userstories.md MVP Scope).
- [ ] Search 50 articles completes in <6s (P95).
- [ ] >50% city resolution on sample articles.
- [ ] <10% article fetch error rate.
- [ ] All filters reachable via keyboard.
- [ ] No persistent storage across sessions.
- [ ] Map + timeline + metrics visible and interactive.
- [ ] Issue tags toggle on/off.

---

## Phase 2: Polish & Extras (Week 6–8)
**Goal:** Refinement, edge cases, advanced features from Should/Could lists.

### Deliverables
- Shareable query URL (encode search params; recompute on open).
- Export GeoJSON / CSV.
- Search cancellation.
- Retry individual failed articles.
- Onboarding tooltip tour.
- Rate limit warnings & retry guidance.
- Advanced NLP toggle (optional spaCy for city detection).
- More comprehensive issue tagging (LGBTQ, racism, sexism, misidentification).
- Performance metrics in UI (avg latency, errors per phase).
- Data retention notice (no storage, stateless reminder).

### Tasks
1. **Backend (3–4 days)**
   - Query URL serialization (terms, filters → base64 or JSON in URL).
   - Export endpoint: `/api/search/:id/export?format=geojson|csv`.
   - Cancel search endpoint: POST `/api/search/:id/cancel` (advisory, sets a flag).
   - Retry endpoint: POST `/api/search/:id/retry-article/:articleId`.
   - Issue Tagging refinement
     - Keyword gazetteers per category.
     - Negation handling.
     - Confidence scoring.
   - Metrics endpoint: `/api/search/:id/metrics` (latency, error rates).

2. **Frontend (3–4 days)**
   - URL bar shows query params; reload with same terms.
   - Export button → download GeoJSON/CSV.
   - Cancel button during search (stops polling, shows summary so far).
   - Retry button on error badges.
   - Onboarding modal on first launch (skip if dismissed).
   - Rate limit banner with retry-after countdown.
   - Settings panel
     - Dark/light toggle (persist in localStorage if allowed; or read system preference).
     - Enable/disable issue tagging.
     - Confidence thresholds.
   - Performance panel: show current latency, error breakdown.

3. **Testing & Docs**
   - Unit tests for city extractor, classifier, issue tagger.
   - Integration test: mock RSS feed → full pipeline.
   - API documentation (OpenAPI/Swagger snippet).
   - Troubleshooting guide (distrobox issues, backend not reachable, etc.).

### Acceptance Criteria
- [ ] Should-Have stories 1–8 implemented (cancellation, retry, onboarding, etc.).
- [ ] Shareable URL works: copy link → paste in new tab → same results load.
- [ ] Export produces valid GeoJSON/CSV.
- [ ] Cancellation stops incremental updates.
- [ ] Onboarding tour guides new users through map/filters/details.
- [ ] Rate limit warning is clear and actionable.
- [ ] Performance metrics match targets (P95 < 6s).

---

## Phase 3: Scaling & Extras (Post-MVP)
**Goal:** Advanced research features, admin dashboard, feedback loop.

### Possible Features
- Saved searches & preferences (client-side only; localStorage or IndexedDB).
- Research exports (per-source retraction ratios, temporal trends).
- Tag feedback loop (user flags false positives; admin reviews; iterate on keyword lists).
- Admin dashboard (queue depth, error rates, feature flags).
- Multilingual expansion (config-driven; English-only for MVP).
- Advanced accessibility (ARIA live regions, screen reader optimization).

---

## Timeline Summary

| Phase | Duration | Key Milestone |
|-------|----------|---------------|
| 0 (Demo) | 1–2 weeks | Map + search + mock data |
| 1 (MVP) | 3–5 weeks | Full core features, real RSS, filters, metrics |
| 2 (Polish) | 2–3 weeks | Export, cancellation, onboarding, perf optimization |
| 3 (Extras) | TBD | Research tools, admin, feedback, i18n |

**Total MVP (Phases 0–2): ~8–10 weeks**

---

## Dependencies & Blockers

### Hard Blockers (resolve immediately)
- Distrobox/Docker setup working (verified in Phase 0).
- Node 20 + npm available in container.
- Expo CLI and react-native-maps working.

### Soft Blockers (manage during Phase 1)
- RSS feed stability (some feeds may be rate-limited; have fallbacks).
- City gazetteer accuracy (50% is acceptable for MVP; improve later).
- Marker clustering library choice (test performance with 100+ markers).

---

## Risk Mitigation

1. **Slow RSS fetches**: Implement timeout + circuit breaker early (Phase 1).
2. **City extraction false positives**: Start with conservative matching; relax if needed.
3. **Map performance**: Use clustering + virtualization if >200 markers.
4. **Expo deployment**: Test tunnel mode early; have web fallback.
5. **Stateless constraint**: Keep all aggregation in-memory; no DB temptation.

---

## Success Criteria by Phase

### Phase 0
- [ ] Proof of concept visible to stakeholder.
- [ ] No database; all transient.
- [ ] Runnable via `./start-docker.sh`.

### Phase 1
- [ ] MVP Must-Have features > 70% implemented.
- [ ] Real data from RSS feeds.
- [ ] Accessible via keyboard + color-blind shapes.
- [ ] Performance target met.

### Phase 2
- [ ] All MVP Must-Have + most Should-Have complete.
- [ ] Shareable, exportable, cancellable.
- [ ] User-facing error messaging & guidance.
- [ ] Ready for wider testing/feedback.

---

## Notes
- Each phase feeds into next; no rework expected if design docs followed.
- Stateless constraint simplifies debugging; prioritize it always.
- User stories are source of truth; phases map cleanly to them.
- Code review & testing happen continuously within each phase.
