#!/bin/bash
# Test data script for Natural Flow
# Run this after starting the backend to populate with sample data

API_URL="http://localhost:8080/api/flow"

echo "🚀 Natural Flow - Adding Test Data"
echo "=================================="
echo ""

# Test if backend is running
echo "Testing backend connection..."
if curl -s -f "${API_URL}/tickers" > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running. Start it with: mvn spring-boot:run"
    exit 1
fi

echo ""
echo "Adding test flow data..."
echo ""

# QQQ Call 1
echo "Adding QQQ Call #1..."
curl -s -X POST "${API_URL}/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": '$(date +%s)'000,
    "underlying": "QQQ",
    "option_symbol": "QQQ251107C00490000",
    "side": "CALL",
    "action": "BUY",
    "strike": 490,
    "expiry": "2025-11-07",
    "premium": 125000,
    "size": 250
  }' | jq '.'

# QQQ Call 2
echo ""
echo "Adding QQQ Call #2..."
curl -s -X POST "${API_URL}/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": '$(date -v-10M +%s)'000,
    "underlying": "QQQ",
    "option_symbol": "QQQ251114C00485000",
    "side": "CALL",
    "action": "BUY",
    "strike": 485,
    "expiry": "2025-11-14",
    "premium": 215000,
    "size": 430
  }' | jq '.'

# QQQ Put
echo ""
echo "Adding QQQ Put..."
curl -s -X POST "${API_URL}/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": '$(date -v-20M +%s)'000,
    "underlying": "QQQ",
    "option_symbol": "QQQ251121P00480000",
    "side": "PUT",
    "action": "BUY",
    "strike": 480,
    "expiry": "2025-11-21",
    "premium": 92000,
    "size": 184
  }' | jq '.'

# SPY Put
echo ""
echo "Adding SPY Put..."
curl -s -X POST "${API_URL}/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": '$(date -v-5M +%s)'000,
    "underlying": "SPY",
    "option_symbol": "SPY251031P00575000",
    "side": "PUT",
    "action": "BUY",
    "strike": 575,
    "expiry": "2025-10-31",
    "premium": 87500,
    "size": 175
  }' | jq '.'

# SPY Put 2
echo ""
echo "Adding SPY Put #2..."
curl -s -X POST "${API_URL}/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": '$(date -v-15M +%s)'000,
    "underlying": "SPY",
    "option_symbol": "SPY251114P00570000",
    "side": "PUT",
    "action": "BUY",
    "strike": 570,
    "expiry": "2025-11-14",
    "premium": 105000,
    "size": 210
  }' | jq '.'

# TSLA Call
echo ""
echo "Adding TSLA Call..."
curl -s -X POST "${API_URL}/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": '$(date -v-8M +%s)'000,
    "underlying": "TSLA",
    "option_symbol": "TSLA251114C00250000",
    "side": "CALL",
    "action": "BUY",
    "strike": 250,
    "expiry": "2025-11-14",
    "premium": 215000,
    "size": 430
  }' | jq '.'

# NVDA Call
echo ""
echo "Adding NVDA Call..."
curl -s -X POST "${API_URL}/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": '$(date -v-12M +%s)'000,
    "underlying": "NVDA",
    "option_symbol": "NVDA251205C00145000",
    "side": "CALL",
    "action": "BUY",
    "strike": 145,
    "expiry": "2025-12-05",
    "premium": 178000,
    "size": 356
  }' | jq '.'

# AAPL Call
echo ""
echo "Adding AAPL Call..."
curl -s -X POST "${API_URL}/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": '$(date -v-18M +%s)'000,
    "underlying": "AAPL",
    "option_symbol": "AAPL251107C00230000",
    "side": "CALL",
    "action": "BUY",
    "strike": 230,
    "expiry": "2025-11-07",
    "premium": 142000,
    "size": 284
  }' | jq '.'

echo ""
echo "=================================="
echo "✅ Test data added successfully!"
echo ""
echo "Available tickers:"
curl -s "${API_URL}/tickers" | jq '.'
echo ""
echo "Try these URLs:"
echo "  - http://localhost:5173 (Frontend)"
echo "  - ${API_URL}/latest?symbol=QQQ"
echo "  - ${API_URL}/summary?symbol=QQQ"
echo "  - ${API_URL}/building?symbol=QQQ&minPremium=50000"
