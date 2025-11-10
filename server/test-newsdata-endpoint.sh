#!/usr/bin/env bash
# test-newsdata-endpoint.sh
# Test /api/search endpoint for Newsdata fetch, rate limit warning, and graceful fallback

set -e
API_URL="http://localhost:3000/api/search"
TERMS='{"terms": ["election", "policy"], "limit": 5}'

# Test with API key (should use real Newsdata)
echo "Testing /api/search with API key..."
NEWSDATA_API_KEY="$NEWSDATA_API_KEY" curl -s -X POST "$API_URL" -H 'Content-Type: application/json' -d "$TERMS" | tee result.json

if grep -q 'rateLimitWarning' result.json; then
  echo "[INFO] Rate limit warning present in response."
fi
if grep -q 'usedMock' result.json; then
  echo "[INFO] Fallback to mock data detected."
fi

SEARCH_ID=$(jq -r .search_id result.json)
if [ "$SEARCH_ID" = "null" ]; then
  echo "[ERROR] No search_id returned!"
  exit 1
fi

# Test results endpoint
echo "Testing /api/search/$SEARCH_ID/results..."
curl -s "$API_URL/$SEARCH_ID/results" | jq .

echo "Test complete."
