#!/bin/bash
# Test legend endpoint

echo "📊 Testing Backend Legend Endpoint..."
RESPONSE=$(curl -s http://localhost:3000/api/legend)
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"statuses"'; then
  echo "✅ Legend endpoint returned valid response"
  
  # Check for required status types
  for status in "retraction" "correction" "original" "inciting"; do
    if echo "$RESPONSE" | grep -q "\"$status\""; then
      echo "  ✅ $status status present"
    else
      echo "  ❌ $status status missing"
      exit 1
    fi
  done
else
  echo "❌ Legend endpoint failed"
  exit 1
fi
