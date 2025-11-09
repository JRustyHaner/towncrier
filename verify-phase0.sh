#!/bin/bash
# Comprehensive Phase 0 verification script

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=3000
FRONTEND_PORT=3001

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Phase 0 Verification & Acceptance Criteria            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

TESTS_PASSED=0
TESTS_FAILED=0

# Helper function
test_endpoint() {
  local name=$1
  local url=$2
  local method=${3:-GET}
  local data=$4
  
  echo -e "${YELLOW}Testing: $name${NC}"
  
  if [ "$method" = "POST" ]; then
    RESPONSE=$(curl -s -X POST "$url" \
      -H "Content-Type: application/json" \
      -d "$data")
  else
    RESPONSE=$(curl -s "$url")
  fi
  
  echo "$RESPONSE"
}

# Check backend is running
echo -e "\n${BLUE}─────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}1. BACKEND CHECKS${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Backend is running on port $BACKEND_PORT${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}❌ Backend not running on port $BACKEND_PORT${NC}"
  echo -e "   Start it with: cd server && npm run dev"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  exit 1
fi

# Test 1: Health Check
echo -e "\n${YELLOW}Test 1: GET /api/health${NC}"
HEALTH=$(curl -s http://localhost:$BACKEND_PORT/api/health)
echo "Response: $HEALTH"

if echo "$HEALTH" | grep -q '"ok":true'; then
  echo -e "${GREEN}✅ Health check passed${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}❌ Health check failed${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 2: Legend
echo -e "\n${YELLOW}Test 2: GET /api/legend${NC}"
LEGEND=$(curl -s http://localhost:$BACKEND_PORT/api/legend)
echo "Response: $LEGEND"

if echo "$LEGEND" | grep -q '"statuses"'; then
  echo -e "${GREEN}✅ Legend endpoint working${NC}"
  
  for status in "retraction" "correction" "original" "inciting"; do
    if echo "$LEGEND" | grep -q "\"$status\""; then
      echo -e "  ${GREEN}✅${NC} Status '$status' present"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo -e "  ${RED}❌${NC} Status '$status' missing"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
  done
else
  echo -e "${RED}❌ Legend endpoint failed${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 3: Search
echo -e "\n${YELLOW}Test 3: POST /api/search${NC}"
SEARCH=$(curl -s -X POST http://localhost:$BACKEND_PORT/api/search \
  -H "Content-Type: application/json" \
  -d '{"terms": ["test"], "limit": 40}')
echo "Response: $SEARCH"

if echo "$SEARCH" | grep -q '"search_id"'; then
  SEARCH_ID=$(echo "$SEARCH" | grep -o '"search_id":"[^"]*' | cut -d'"' -f4)
  echo -e "${GREEN}✅ Search endpoint working (ID: $SEARCH_ID)${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  
  # Test 4: Results
  echo -e "\n${YELLOW}Test 4: GET /api/search/:id/results${NC}"
  sleep 1
  RESULTS=$(curl -s http://localhost:$BACKEND_PORT/api/search/$SEARCH_ID/results)
  echo "Response (truncated): $(echo $RESULTS | cut -c1-200)..."
  
  if echo "$RESULTS" | grep -q '"type":"FeatureCollection"'; then
    FEATURE_COUNT=$(echo "$RESULTS" | grep -o '"type":"Feature"' | wc -l)
    echo -e "${GREEN}✅ Valid GeoJSON returned (${FEATURE_COUNT} features)${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    if [ "$FEATURE_COUNT" -ge 5 ]; then
      echo -e "${GREEN}✅ At least 5 features present (requirement: ≥5)${NC}"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo -e "${RED}❌ Less than 5 features ($FEATURE_COUNT)${NC}"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Check for article properties
    if echo "$RESULTS" | grep -q '"title"' && echo "$RESULTS" | grep -q '"status"'; then
      echo -e "${GREEN}✅ Articles have required properties (title, status)${NC}"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo -e "${RED}❌ Missing required article properties${NC}"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
  else
    echo -e "${RED}❌ Invalid GeoJSON format${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
else
  echo -e "${RED}❌ Search endpoint failed${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Check frontend is running
echo -e "\n${BLUE}─────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}2. FRONTEND CHECKS${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Frontend is running on port $FRONTEND_PORT${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${YELLOW}⚠️  Frontend not running on port $FRONTEND_PORT${NC}"
  echo -e "   Start it with: cd frontend && npm run web"
  echo -e "   (Continuing with backend-only tests)"
fi

# Check file structure
echo -e "\n${BLUE}─────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}3. FILE STRUCTURE CHECKS${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

FILES=(
  "server/src/index.ts"
  "server/src/services/rssFetcher.ts"
  "server/src/services/cityExtractor.ts"
  "server/src/services/statusClassifier.ts"
  "frontend/App.tsx"
  "frontend/components/MapView.tsx"
  "frontend/api.ts"
  "frontend/theme.ts"
  "STYLEGUIDE.md"
  "phased_development.md"
)

for file in "${FILES[@]}"; do
  if [ -f "$PROJECT_DIR/$file" ]; then
    echo -e "${GREEN}✅${NC} $file"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}❌${NC} $file (missing)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
done

# Check scripts are executable
echo -e "\n${BLUE}─────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}4. SCRIPT CHECKS${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"

SCRIPTS=(
  "start-all.sh"
  "test-health.sh"
  "test-legend.sh"
  "test-search.sh"
)

for script in "${SCRIPTS[@]}"; do
  if [ -f "$PROJECT_DIR/$script" ] && [ -x "$PROJECT_DIR/$script" ]; then
    echo -e "${GREEN}✅${NC} $script (executable)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}❌${NC} $script (not executable or missing)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
done

# Final Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST SUMMARY                            ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}${BLUE}║                 ✅ ALL TESTS PASSED! ✅                 ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
  echo -e "\n${GREEN}Phase 0 is ready for demonstration!${NC}"
  echo -e "\n${YELLOW}Next steps:${NC}"
  echo -e "  1. Open browser: http://localhost:$FRONTEND_PORT"
  echo -e "  2. Type a search term in the search box"
  echo -e "  3. Click the map or list tab to view results"
  echo -e "  4. Tap an article to see details"
  echo -e "  5. Toggle dark mode with the button in the header"
  exit 0
else
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
  echo -e "\n${RED}Some tests failed. Please check the errors above.${NC}"
  exit 1
fi
