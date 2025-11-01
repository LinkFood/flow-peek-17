#!/bin/bash
# Start Natural Flow Backend with API Keys
# Edit this file and add your actual API keys below

echo "🚀 Starting Natural Flow Backend..."
echo ""

# ===========================================
# ADD YOUR API KEYS HERE:
# ===========================================

# Get your Polygon API key from: https://polygon.io/dashboard/api-keys
# IMPORTANT: No newlines in the key! Copy/paste carefully
export POLYGON_API_KEY="your-polygon-api-key-here"

# Get your OpenAI API key from: https://platform.openai.com/api-keys  
# IMPORTANT: No newlines in the key! Copy/paste carefully
export OPENAI_API_KEY="your-openai-api-key-here"

# Enable Polygon polling (set to true to auto-ingest data)
export POLYGON_ENABLED="true"  # Now enabled - will poll every 5 seconds!

# Optional: Choose OpenAI model (gpt-4 is more expensive but better)
export OPENAI_MODEL="gpt-4"  # or "gpt-3.5-turbo"

# ===========================================
# No need to edit below this line
# ===========================================

# Check if keys are set
if [ "$POLYGON_API_KEY" = "your-polygon-api-key-here" ]; then
    echo "⚠️  Warning: Polygon API key not set!"
    echo "   Edit start-with-keys.sh and add your key from:"
    echo "   https://polygon.io/dashboard/api-keys"
    echo ""
fi

if [ "$OPENAI_API_KEY" = "your-openai-api-key-here" ]; then
    echo "⚠️  Warning: OpenAI API key not set!"
    echo "   Edit start-with-keys.sh and add your key from:"
    echo "   https://platform.openai.com/api-keys"
    echo ""
fi

echo "Configuration:"
echo "  Polygon API Key: ${POLYGON_API_KEY:0:10}..."
echo "  OpenAI API Key:  ${OPENAI_API_KEY:0:10}..."
echo "  Polygon Polling: $POLYGON_ENABLED"
echo "  OpenAI Model:    $OPENAI_MODEL"
echo ""

if [ "$POLYGON_ENABLED" = "true" ]; then
    echo "✅ Polygon polling is ENABLED - will auto-ingest data every 5 seconds"
else
    echo "ℹ️  Polygon polling is DISABLED - use test-data.sh to add sample data"
fi

echo ""
echo "Starting backend on http://localhost:8080"
echo "Press Ctrl+C to stop"
echo ""

# Start Spring Boot
mvn spring-boot:run
