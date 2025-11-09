# Phase 0 - Quick Start Guide

## 🚀 Quick Start (One Command)

Run everything in one go:

```bash
./start-all.sh
```

This script will:
- ✅ Check prerequisites (Node.js, npm)
- ✅ Install dependencies if needed
- ✅ Start the backend server on port 3000
- ✅ Test backend endpoints
- ✅ Start the frontend on port 3001
- ✅ Open a browser window automatically
- ✅ Show real-time logs

**Press Ctrl+C to stop all services.**

---

## 🧪 Manual Testing

If you prefer to start services manually:

### 1. Start Backend (Terminal 1)
```bash
cd server
npm run dev
```
Backend will run on `http://localhost:3000`

### 2. Test Backend Endpoints (Terminal 2, after backend is running)

**Health Check:**
```bash
./test-health.sh
```
Expected: `{"ok":true,"features":{"storage":"none","stateless":true}}`

**Legend (colors & shapes):**
```bash
./test-legend.sh
```
Expected: Legend with retraction, correction, original, inciting statuses

**Search & GeoJSON:**
```bash
./test-search.sh
```
Expected: GeoJSON FeatureCollection with ≥5 features (articles)

### 3. Start Frontend (Terminal 3)
```bash
cd frontend
npm start
# Then press 'w' for web, or:
npm run web
```
Frontend will run on `http://localhost:3001`

---

## 📊 What You'll See

### Backend Endpoints

**GET /api/health**
```json
{
  "ok": true,
  "features": {
    "storage": "none",
    "stateless": true
  }
}
```

**GET /api/legend**
```json
{
  "statuses": {
    "retraction": { "color": "#ef4444", "shape": "circle", "label": "Retraction" },
    "correction": { "color": "#f59e0b", "shape": "square", "label": "Correction" },
    "original": { "color": "#22c55e", "shape": "triangle", "label": "Original" },
    "inciting": { "color": "#137fec", "shape": "ring", "label": "Inciting" }
  }
}
```

**POST /api/search**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"terms": ["test"], "limit": 40}'
```

Returns search ID:
```json
{
  "search_id": "uuid-here",
  "status": "complete"
}
```

**GET /api/search/:id/results**
```bash
curl http://localhost:3000/api/search/uuid-here/results
```

Returns GeoJSON with articles as features:
```json
{
  "search_id": "uuid-here",
  "ready": true,
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [-74.0060, 40.7128]
        },
        "properties": {
          "id": "1",
          "title": "Mayor Calls for Urgent Action...",
          "author": "John Smith",
          "source": "NY Times",
          "publishDate": "2025-11-07T...",
          "link": "https://...",
          "description": "Local government officials...",
          "status": "original",
          "city": "New York City, NY",
          "confidence": 0.95
        }
      }
      // ... more features
    ]
  },
  "summary": {
    "total": 10,
    "retractions": 1,
    "corrections": 1,
    "originals": 7,
    "inciting": 1
  }
}
```

### Frontend Features

- 🎨 **Light/Dark Mode Toggle** - Click sun/moon icon in header
- 🔍 **Search Bar** - Enter search terms, press Enter or tap arrow
- 🗺️ **Map View** - Visual display of articles by location
- 📋 **List View** - Scrollable list of articles
- 📍 **Article Detail Modal** - Tap article to see full info
- 🎯 **Legend** - Shows status colors & shapes
- 📊 **Summary Stats** - Total articles, retractions, corrections

---

## 📁 Phase 0 Structure

```
towncrier/
├── server/
│   ├── src/
│   │   ├── index.ts              # Express app & routes
│   │   └── services/
│   │       ├── rssFetcher.ts      # Mock RSS feed (10 articles)
│   │       ├── cityExtractor.ts   # Fake lat/lng extraction
│   │       └── statusClassifier.ts# Article status classification
│   └── package.json
├── frontend/
│   ├── App.tsx                   # Main app with search & results
│   ├── components/
│   │   └── MapView.tsx           # Map display + fallback list
│   ├── api.ts                    # Backend API client
│   ├── theme.ts                  # Light/dark theme & colors
│   └── package.json
├── start-all.sh                  # ⭐ One-command startup
├── test-health.sh               # Test health endpoint
├── test-legend.sh               # Test legend endpoint
├── test-search.sh               # Test search endpoint
└── STYLEGUIDE.md                # Design tokens & colors
```

---

## ✅ Acceptance Criteria (Phase 0)

- [x] Backend starts; `/api/health` returns `{ ok: true }`
- [x] `/api/search` returns GeoJSON with ≥5 features
- [x] Frontend loads, displays map with markers
- [x] Tapping marker shows title, source, date in detail view
- [x] Search input → backend call → map/list updates
- [x] No data persists after reload/back navigation (stateless)

---

## 🛠️ Troubleshooting

**Backend won't start:**
```bash
# Check if port 3000 is already in use
lsof -i :3000
# Kill process: kill -9 <PID>
```

**Frontend won't start:**
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

**Can't connect backend to frontend:**
- Ensure backend is running on `http://localhost:3000`
- Check frontend is trying to connect to the right URL
- Both should be on localhost

**Browser doesn't open automatically:**
```bash
# Manually open frontend URL
open http://localhost:3001
# or
xdg-open http://localhost:3001
```

---

## 📚 Next Steps

After Phase 0 demonstrator works:
- **Phase 1:** Real RSS fetching, better city extraction, full filters
- **Phase 2:** Export, sharing, polishing
- **Phase 3:** Advanced features, admin dashboard

See `phased_development.md` for full roadmap.
