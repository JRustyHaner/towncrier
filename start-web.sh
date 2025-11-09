#!/bin/bash
# Towncrier Phase 0 - Quick Web Start (Backend + Simple Web Frontend)

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/server"

BACKEND_PORT=${BACKEND_PORT:-3000}
FRONTEND_PORT=${FRONTEND_PORT:-3001}
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Towncrier Phase 0 - Web Demonstrator              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Function to cleanup
cleanup() {
  echo -e "${YELLOW}\n⏹️  Shutting down services...${NC}"
  if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
  fi
  if [ ! -z "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  exit 0
}

trap cleanup EXIT INT TERM

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

if ! command -v python3 &> /dev/null; then
  echo -e "${RED}❌ Python3 not found${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Python3 $(python3 --version)${NC}"

# Install backend dependencies if needed
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
  cd "$BACKEND_DIR"
  npm install
  cd "$PROJECT_DIR"
fi

# Start backend
echo -e "${YELLOW}🚀 Starting backend on port $BACKEND_PORT...${NC}"
cd "$BACKEND_DIR"
npm run dev > /tmp/towncrier-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"

# Wait for backend
echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0
until curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1 || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  [ $RETRY_COUNT -eq 1 ] && echo -n "  "
  echo -n "."
  sleep 0.5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo -e "${RED}❌ Backend failed to start${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Backend is ready!${NC}"

# Start frontend web server
echo -e "${YELLOW}🚀 Starting web frontend on port $FRONTEND_PORT...${NC}"
cd "$PROJECT_DIR"
python3 -m http.server $FRONTEND_PORT > /tmp/towncrier-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait a moment for server to start
sleep 1

# Open browser
if command -v xdg-open > /dev/null; then
  xdg-open "$FRONTEND_URL" 2>/dev/null || true
elif command -v open > /dev/null; then
  open "$FRONTEND_URL" 2>/dev/null || true
fi

# Summary
echo -e ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    🎉 Running!                            ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}Backend:${NC}  http://localhost:$BACKEND_PORT"
echo -e "${GREEN}Frontend:${NC} $FRONTEND_URL"
echo -e ""
echo -e "${YELLOW}Try this:${NC}"
echo -e "  1. Type 'test' in the search box"
echo -e "  2. Click Search"
echo -e "  3. Switch between Map and List views"
echo -e "  4. Click an article to see details"
echo -e "  5. Toggle dark mode with the button"
echo -e ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Keep running
wait
