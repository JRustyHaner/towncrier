#!/bin/bash
set -e

# Towncrier startup script using Docker Compose

echo "🚀 Starting Towncrier with Docker Compose..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
  echo "❌ Docker and docker-compose not found."
  echo "   Please install Docker Desktop or Docker Engine + Docker Compose."
  exit 1
fi

# Prefer docker compose over docker-compose
COMPOSE_CMD="docker compose"
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
fi

echo "📦 Building images..."
$COMPOSE_CMD build

echo "✅ Starting services..."
$COMPOSE_CMD up

# Cleanup on exit
trap "echo '🛑 Stopping services...' && $COMPOSE_CMD down" EXIT
