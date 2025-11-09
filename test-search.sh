#!/bin/bash
# Test backend search endpoint

echo "🔍 Testing Backend Search Endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"terms": ["test"], "limit": 40}')

echo "Search initiated: $RESPONSE"

# Extract search ID from response
SEARCH_ID=$(echo "$RESPONSE" | grep -o '"search_id":"[^"]*' | cut -d'"' -f4)
echo "Search ID: $SEARCH_ID"

if [ -z "$SEARCH_ID" ]; then
  echo "❌ Failed to get search ID"
  exit 1
fi

# Wait a moment for results
sleep 1

# Get results
echo "🔎 Fetching results..."
RESULTS=$(curl -s http://localhost:3000/api/search/$SEARCH_ID/results)
echo "Results: $RESULTS"

# Validate GeoJSON
if echo "$RESULTS" | grep -q '"type":"FeatureCollection"'; then
  FEATURE_COUNT=$(echo "$RESULTS" | grep -o '"type":"Feature"' | wc -l)
  echo "✅ Valid GeoJSON with $FEATURE_COUNT features"
  
  if [ "$FEATURE_COUNT" -ge 5 ]; then
    echo "✅ At least 5 features present"
  else
    echo "❌ Less than 5 features ($FEATURE_COUNT)"
    exit 1
  fi
else
  echo "❌ Invalid GeoJSON format"
  exit 1
fi
