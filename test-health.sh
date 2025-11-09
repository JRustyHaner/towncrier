#!/bin/bash
# Test backend health endpoint

echo "🏥 Testing Backend Health Check..."
RESPONSE=$(curl -s http://localhost:3000/api/health)
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  exit 1
fi
