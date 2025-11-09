#!/bin/bash
# Towncrier Phase 0 Demonstrator - Start Backend + Frontend + Open Browser

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/server"
FRONTEND_DIR="$PROJECT_DIR/frontend"

BACKEND_PORT=${BACKEND_PORT:-3000}
FRONTEND_PORT=${FRONTEND_PORT:-3001}
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Towncrier Phase 0 - Demonstrator                   ║${NC}"
echo -e "${BLUE}║         Backend + Frontend Launcher                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Function to cleanup on exit
cleanup() {
  echo -e "${YELLOW}\n⏹️  Shutting down services...${NC}"
  if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
    echo "  Backend stopped (PID: $BACKEND_PID)"
  fi
  if [ ! -z "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null || true
    echo "  Frontend stopped (PID: $FRONTEND_PID)"
  fi
  exit 0
}

# Set up trap to cleanup on exit
trap cleanup EXIT INT TERM

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found. Please install Node.js 20+${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node -v)${NC}"

if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm not found. Please install npm${NC}"
  exit 1
fi
echo -e "${GREEN}✅ npm found: $(npm -v)${NC}"

# Install backend dependencies if needed
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
  cd "$BACKEND_DIR"
  npm install
  cd "$PROJECT_DIR"
fi

# Install frontend dependencies if needed
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
  cd "$FRONTEND_DIR"
  npm install
  cd "$PROJECT_DIR"
fi

# Start backend
echo -e "${YELLOW}🚀 Starting backend server on port $BACKEND_PORT...${NC}"
cd "$BACKEND_DIR"
BACKEND_LOGFILE="/tmp/towncrier-backend.log"
npm run dev > "$BACKEND_LOGFILE" 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "   Logs: $BACKEND_LOGFILE"

# Wait for backend to be ready
echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0
until curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1 || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq 1 ]; then
    echo -n "  "
  fi
  echo -n "."
  sleep 0.5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo -e "${RED}❌ Backend failed to start after ${MAX_RETRIES} retries${NC}"
  echo -e "${YELLOW}Check logs at: $BACKEND_LOGFILE${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Backend is ready!${NC}"

# Test backend endpoints
echo -e "${YELLOW}🧪 Testing backend endpoints...${NC}"
HEALTH=$(curl -s http://localhost:$BACKEND_PORT/api/health)
if echo "$HEALTH" | grep -q '"ok":true'; then
  echo -e "${GREEN}  ✅ /api/health working${NC}"
else
  echo -e "${RED}  ❌ /api/health failed${NC}"
fi

LEGEND=$(curl -s http://localhost:$BACKEND_PORT/api/legend)
if echo "$LEGEND" | grep -q '"statuses"'; then
  echo -e "${GREEN}  ✅ /api/legend working${NC}"
else
  echo -e "${RED}  ❌ /api/legend failed${NC}"
fi

SEARCH=$(curl -s -X POST http://localhost:$BACKEND_PORT/api/search \
  -H "Content-Type: application/json" \
  -d '{"terms":["test"],"limit":40}')
if echo "$SEARCH" | grep -q '"search_id"'; then
  echo -e "${GREEN}  ✅ /api/search working${NC}"
else
  echo -e "${RED}  ❌ /api/search failed${NC}"
fi

# Start frontend
echo -e "${YELLOW}🚀 Starting frontend on port $FRONTEND_PORT...${NC}"
cd "$FRONTEND_DIR"
FRONTEND_LOGFILE="/tmp/towncrier-frontend.log"

# For Expo web, start with web preset
if command -v npx &> /dev/null; then
  EXPO_PORT=$FRONTEND_PORT npm start -- --web > "$FRONTEND_LOGFILE" 2>&1 &
  FRONTEND_PID=$!
  echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
  echo -e "   Logs: $FRONTEND_LOGFILE"
else
  echo -e "${RED}❌ expo-cli not found${NC}"
  exit 1
fi

# Wait for frontend to be ready
echo -e "${YELLOW}⏳ Waiting for frontend to be ready...${NC}"
MAX_RETRIES=60
RETRY_COUNT=0
until curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1 || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq 1 ]; then
    echo -n "  "
  fi
  echo -n "."
  sleep 0.5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo -e "${YELLOW}⚠️  Frontend is taking a while to start (this is normal for first run)${NC}"
  echo -e "   You can access it at: $FRONTEND_URL when ready"
else
  echo -e "${GREEN}✅ Frontend is ready!${NC}"
fi

# Open browser
echo -e "${YELLOW}🌐 Opening browser...${NC}"
if command -v xdg-open > /dev/null; then
  xdg-open "$FRONTEND_URL" 2>/dev/null || true
elif command -v open > /dev/null; then
  open "$FRONTEND_URL" 2>/dev/null || true
elif command -v start > /dev/null; then
  start "$FRONTEND_URL" 2>/dev/null || true
else
  echo -e "${YELLOW}⚠️  Could not auto-open browser${NC}"
fi

# Print summary
echo -e ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    🎉 All systems running!                 ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}Backend:${NC}  http://localhost:$BACKEND_PORT"
echo -e "  • /api/health     - Health check"
echo -e "  • /api/legend     - Get color legend"
echo -e "  • /api/search     - POST search terms"
echo -e ""
echo -e "${GREEN}Frontend:${NC} $FRONTEND_URL"
echo -e "  • Map view with article markers"
echo -e "  • List view with articles"
echo -e "  • Detail modal for each article"
echo -e ""
echo -e "${GREEN}Logs:${NC}"
echo -e "  Backend:  $BACKEND_LOGFILE"
echo -e "  Frontend: $FRONTEND_LOGFILE"
echo -e ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Keep script running
wait
