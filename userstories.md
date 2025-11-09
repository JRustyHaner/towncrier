# Towncrier User Stories

## User Stories 1–50

1. As a user, I want to enter search terms to find relevant news articles.
2. As a user, I want to see a map showing the geographic origin of news sources.
3. As a user, I want to see the reported city of each article on the map.
4. As a user, I want to filter articles by date range.
5. As a user, I want to filter articles by topic (e.g., Politics, Science, Health).
6. As a user, I want to filter articles by event type (All, Inciting, Correction, Retraction).
7. As a user, I want to toggle between viewing source headquarters and reported city on the map.
8. As a user, I want to see color-coded markers for retractions, corrections, originals, and inciting articles.
9. As a user, I want to see a legend explaining the color codes.
10. As a user, I want to cluster map markers for dense areas.
11. As a user, I want to see a timeline slider to filter articles by publication date.
12. As a user, I want to see a histogram of article counts over time.
13. As a user, I want to see the percentage of retractions and corrections.
14. As a user, I want to see article details by clicking a map marker.
15. As a user, I want to see the article title, source, and publication date in the details panel.
16. As a user, I want to see a timeline of events for an article (e.g., initial report, correction).
17. As a user, I want to see links to the original article, correction notice, and related coverage.
18. As a user, I want to search by publication name.
19. As a user, I want to limit the number of articles returned (e.g., 20–100).
20. As a user, I want to see which articles are paywalled.
21. As a user, I want to see which articles failed to fetch or parse.
22. As a user, I want to see which articles had city extraction errors.
23. As a user, I want to see which articles had source HQ lookup errors.
24. As a user, I want to see which articles were deduplicated.
25. As a user, I want to see which articles were classified as retraction, correction, original, or inciting.
26. As a user, I want to see issue tags (e.g., LGBTQ, racism, sexism, misidentification) for articles.
27. As a user, I want to filter articles by issue tags.
28. As a user, I want to see the confidence score for each issue tag.
29. As a user, I want to hide or show issue tags via a UI toggle.
30. As a user, I want to see a warning if issue tagging is heuristic and not definitive.
31. As a user, I want to see the number of articles with each issue tag.
32. As a user, I want to see the distribution of issue tags per source.
33. As a user, I want to see the false positive rate estimate for issue tagging.
34. As a user, I want to see the coverage of issue tagging (% of articles with tags).
35. As a user, I want to see the timeline of issue-tagged articles.
36. As a user, I want to see the retraction/correction ratio per source.
37. As a user, I want to see the error rate per phase (fetch, parse, classify).
38. As a user, I want to see the cache hit rate for HQ lookups.
39. As a user, I want to see the average search latency.
40. As a user, I want to see the percentage of articles with resolved city.
41. As a user, I want to see the earliest article for a search (inciting).
42. As a user, I want to see the canonical URL for each article.
43. As a user, I want to see the deduplication key for each article.
44. As a user, I want to see the search session summary (total, retractions, corrections).
45. As a user, I want to see the search session timeline.
46. As a user, I want to see the search session issue tag distribution.
47. As a user, I want to see the search session retraction ratio.
48. As a user, I want to see the search session legend.
49. As a user, I want to see the search session health status.
50. As a user, I want to see the search session metrics.

---

(Next: User Stories 51–100)

## User Stories 51–100

51. As a user, I want to choose AND or OR logic for multi-term searches so that I can refine relevance.
52. As a user, I want to see a confidence score for the reported city on each article so that I can judge location accuracy.
53. As a privacy-conscious user, I want to globally disable issue tagging for my session so that sensitive topic scanning can be turned off.
54. As a user, I want to filter articles by minimum location confidence so that low-certainty geocoding is excluded.
55. As a user, I want visible error badges (fetch, parse, classify) on article entries so that I can quickly spot failures.
56. As a user, I want to hide articles with fetch/parse errors so that my analysis focuses on valid data.
57. As a user, I want to see average and P95 article fetch durations so that I understand performance.
58. As a user, I want a clear rate limit warning with retry time so that I know when to try again.
59. As a color-blind user, I want distinct marker shapes in addition to colors so that I can distinguish statuses.
60. As a user, I want to export current results as GeoJSON or CSV so that I can perform offline analysis.
61. As a user, I want a shareable query URL that encodes my terms and filters (recomputes on open; no stored session) so that I can revisit results without any server or client storage.
62. As a user, I want to see a notice that no data is retained after I leave or reload the page so that I understand the non-persistence model.
63. As a user, I want to request manual review of an issue tag so that false positives can be corrected.
64. As a user, I want to flag an article as mis-tagged (false positive/negative) so that tagging quality improves.
65. As an admin, I want a dashboard of aggregated tagging feedback so that I can tune keyword lists.
66. As a security-conscious user, I want to view the whitelist of feed sources so that I trust data origin.
67. As a user, I want to set a lower concurrency for fetches so that I minimize load or bandwidth usage.
68. As a user, I want to see last HQ cache refresh times so that I know if location data is stale.
69. As a user, I want to view the last updated timestamp of issue keyword configuration so that I know data recency.
70. As a user, I want to toggle inciting article highlighting so that I can simplify the map view if desired.
71. As a user, I want to filter articles by source HQ country so that I can focus on regional origins.
72. As a user, I want (future) language filtering when non-English feeds are added so that multilingual expansion is supported.
73. As a user, I want a privacy notice explaining collected metadata so that I understand usage implications.
74. As a user, I want to download timeline histogram data as JSON so that I can chart it externally.
75. As a user, I want a UI notification when processing completes so that I don't manually poll.
76. As a user, I want live auto-refresh of map results while a search is processing so that I see incremental updates.
77. As a user, I want to pause live updates so that I can inspect the current snapshot without changes.
78. As a user, I want to see classification rationale (matched keywords) for status so that I trust labels.
79. As a user, I want detailed legend tooltips defining each status and tag so that meanings are clear.
80. As a user, I want to filter by paywall status so that I can prioritize accessible articles.
81. As a user, I want to view only unique (non-duplicate) articles so that redundancy is removed.
82. As a user, I want a breakdown chart of error types (timeout, parse, HQ lookup) so that I see reliability issues.
83. As a user, I want to adjust the issue tag confidence threshold so that I control strictness.
84. As a user, I want to toggle advanced NLP city detection so that I can trade accuracy for speed.
85. As a user, I want to see counts of ambiguous city extractions skipped so that I know potential data gaps.
86. As a user, I want a health summary view (service status, feature flags) so that I know system state.
87. As a user, I want an estimated resource usage summary (articles processed, errors, duration) so that I gauge search cost.
88. As a user, I want to bookmark frequent search term sets locally in my browser (no account) so that I can quickly rerun them without logging in.
89. As a user, I want to save my default filter preferences (statuses, tags, confidence) locally in my browser (no account) so that I avoid repetitive setup.
90. As a mobile user, I want a responsive map and timeline layout so that I can explore on smaller screens.
91. As a user, I want an on-page processing reference (e.g., a transient token) during a running search so that I can track progress without any persisted identifier.
92. As an admin, I want to see current pipeline queue depth so that I can assess load.
93. As an admin, I want a feature flag status panel so that I verify configuration.
94. As a researcher, I want to export aggregated retraction ratios per source as CSV so that I can run statistical analysis.
95. As a researcher, I want to filter timeline events by issue tag so that I study temporal patterns of specific issues.
96. As a researcher, I want to view the confidence distribution (histogram) of issue tags so that I evaluate tagging robustness.
97. As an accessibility user, I want full keyboard navigation for filters, map markers, and legend so that I can use the app without a mouse.
98. As a privacy-focused user, I want to clear current results from the page so that nothing remains visible once I choose to stop.
99. As a developer, I want inline API documentation in the UI so that I can integrate programmatically faster.
100. As a developer, I want a built-in test request (sample curl) generator so that I can quickly try endpoints.

## Additional User Stories 101–110

101. As a user, I want to see a progress indicator (e.g., percentage or processed count) while a search is running so that I understand ongoing activity.
102. As a user, I want to cancel an in-progress search so that I can adjust terms without waiting for completion.
103. As a user, I want to reset all filters to defaults with one action so that I can quickly return to the baseline view.
104. As a user, I want an empty-state message with suggestions when no articles match so that I know how to refine my search.
105. As a user, I want loading skeletons/placeholders for map and timeline so that the UI feels responsive during data fetch.
106. As a new user, I want a short onboarding tooltip tour explaining map, timeline, and filters so that I can become productive quickly.
107. As a user, I want to retry fetching an individual article that previously failed so that transient errors can be resolved.
108. As a user, I want to clear a completed result view locally (no server-side deletion needed) so that I maintain control over what’s on screen.
109. As a keyboard user, I want logical tab order and focus indicators for interactive components so that I can navigate without a mouse.
110. As a user, I want to export the current filtered result set as GeoJSON so that I can analyze it externally.

---

## MVP Scope

### MVP Goal
Deliver a functional exploratory interface that ingests predefined RSS feeds, classifies and visualizes article lifecycle (original/correction/retraction/inciting) on a map and timeline with basic filters, ensuring transparency (errors, confidence) and essential accessibility.

### Must Have (Launch Blockers)
- 1 Search input & term processing (stories: 1, 19)
- 2 Map with source HQ vs reported city toggle (2, 3, 7)
- 3 Status classification & color legend (6, 8, 9, 25)
- 4 Timeline slider + histogram (11, 12)
- 5 Article detail panel (14, 15)
- 6 Deduplication (24, 43)
- 7 Retraction/correction metrics summary (13, 44, 47)
- 8 Issue tags displayed & hide toggle (26, 29, 30, 53)
- 9 Error visibility (21, 22, 23, 37) & session health (49, 50)
- 10 Location confidence + percentage resolved (40, 52)
- 11 Inciting article highlight (41, 8/legend synergy)
- 12 Export GeoJSON (60 or 110)
- 13 Progress indicator (101)
- 14 Empty state (104)
- 15 Loading skeletons (105)
- 16 Filter reset (103)
- 17 Keyboard navigation basics (109, 59 shapes for accessibility)
- 18 Early session deletion (108)

### Should Have (High Value, Can Defer Slightly)
- Cancellation of in-progress search (102)
- Retry individual article fetch (107)
- Onboarding tooltip tour (106)
- Paywall indicator & filter (20, 80)
- Performance metrics basic (39, 57)
- Location confidence filter (54)
- Minimum confidence slider for issue tags (83)
- Ambiguous city counts (85)

### Could Have (Future / Post-MVP)
- Saved searches & preferences (88, 89)
- Advanced NLP toggle (84)
- Tag feedback loop (63, 64, 65)
- Rate limit warnings (58)
- Queue depth & admin dashboard (92, 93)
- Research exports (94, 95, 96)
- Advanced accessibility enhancements beyond keyboard (e.g., ARIA live regions)
- Concurrency control (67)
- HQ cache freshness indicators (68)

### Won't Have (Initial MVP Explicitly Out of Scope)
- Internationalization / multilingual tagging (72)
- Full feedback moderation workflow (63–65) beyond simple UI backlog capture
- Complex analytics charts beyond timeline & basic metrics
- Per-source retraction trend chart (can appear later using existing data)
 - User accounts, authentication, or server-side profile storage (all saved searches & preferences remain local-only)
 - Persistent storage of any kind (server DBs, Redis, cookies, localStorage, IndexedDB); only transient in-memory processing during an active page/session

### Acceptance Criteria (Representative Samples)
AC1 Search Execution: Given I enter terms and press search, then progress updates until completion; when finished, map + timeline + metrics populate without full page reload, and no data persists after a page reload.
AC2 Map Toggle: Given results loaded, toggling between Source HQ and Reported City updates visible markers within <300ms for 100 articles.
AC3 Classification Legend: Each status color (retraction, correction, original, inciting outline) appears in legend with counts matching currently filtered set.
AC4 Timeline Filter: Adjusting the timeline range refilters visible markers and histogram counts within <400ms for 100 articles.
AC5 Article Detail: Clicking a marker opens a panel with title, source, publication date, status, city (if any), and issue tags (if enabled).
AC6 Deduplication: Duplicate articles (same canonical URL or dedup key) appear only once; duplicate count displayed in session summary.
AC7 Error Transparency: Articles with fetch/parse/classify issues show an error badge and are optionally hideable via a toggle.
AC8 Location Confidence: Each article with a reported city shows a numeric confidence (0–1 or percentage) and global percentage resolved displayed (>0% if at least one success).
AC9 Export GeoJSON: Clicking Export produces a downloadable FeatureCollection reflecting current filters (<=5MB for 100 articles).
AC10 Accessibility Keyboard: All interactive elements (search, toggle, filters, legend, export) reachable via Tab with visible focus ring.
AC11 Progress Indicator: While processing, a determinate (processed/limit) or indeterminate bar is shown; disappears on completion.
AC12 Clear Results: On clear action, the UI removes the current in-memory results; reloading the page also drops all data since nothing is persisted.

### MVP Success Metrics (Initial Targets)
- Median end-to-end search (50 articles) < 6s (AC observational, not enforced in UI yet).
- >70% of MVP Must stories fully implemented & testable.
- <10% article fetch error rate on curated feed set (excluding paywalled).
- >50% reported city resolution on English US news (initial heuristic baseline).


