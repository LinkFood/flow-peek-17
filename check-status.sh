#!/bin/bash

# Quick status check script
# Run this at the start of any session to see current state

echo "═══════════════════════════════════════════════════════════"
echo "  NATURAL FLOW TERMINAL - STATUS CHECK"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if backend is responding
echo "🔍 Checking Backend..."
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://web-production-43dc4.up.railway.app/api/pulse/mag7-summary")

if [ "$BACKEND_RESPONSE" == "200" ]; then
    echo "✅ Backend is ONLINE"

    # Get current data stats
    SUMMARY=$(curl -s "https://web-production-43dc4.up.railway.app/api/pulse/mag7-summary")
    TOTAL_TRADES=$(echo $SUMMARY | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalTrades', 0))")
    NET_PREMIUM=$(echo $SUMMARY | python3 -c "import sys, json; print(json.load(sys.stdin).get('netPremium', 0))")

    echo "   Total Trades: $TOTAL_TRADES"
    echo "   Net Premium: \$$((NET_PREMIUM / 1000000))M"
else
    echo "❌ Backend is OFFLINE or ERROR (HTTP $BACKEND_RESPONSE)"
fi

echo ""

# Check smart money endpoint
echo "🔍 Checking Smart Money..."
SMART_MONEY=$(curl -s "https://web-production-43dc4.up.railway.app/api/pulse/smart-money?limit=1")
SMART_COUNT=$(echo $SMART_MONEY | python3 -c "import sys, json; print(json.load(sys.stdin).get('count', 0))")

if [ "$SMART_COUNT" -gt "0" ]; then
    echo "✅ Smart Money trades detected: $SMART_COUNT"
    echo "   🎉 REAL DATA IS FLOWING!"
else
    echo "⚠️  Smart Money: 0 trades"
    echo "   Likely still using synthetic data"
fi

echo ""

# Check git status
echo "🔍 Checking Git..."
GIT_STATUS=$(git status --porcelain)
if [ -z "$GIT_STATUS" ]; then
    echo "✅ Working tree is clean"
else
    echo "⚠️  Uncommitted changes detected:"
    echo "$GIT_STATUS" | head -5
fi

echo ""

# Show last 3 commits
echo "📝 Last 3 Commits:"
git log --oneline -3 | sed 's/^/   /'

echo ""

# Check for blockers
echo "🚧 Current Blockers:"
if [ "$SMART_COUNT" -eq "0" ]; then
    echo "   ❌ POLYGON_API_KEY not set in Railway"
    echo "      → Add key to Railway environment variables"
    echo "      → Backend will auto-restart and connect"
else
    echo "   ✅ No blockers - system operational"
fi

echo ""

# Show next steps
echo "📋 Next Steps:"
echo "   1. Read .claude/PROJECT_ETHOS.md for full context"
echo "   2. Check .claude/TASK_TRACKER.json for detailed tasks"
echo "   3. Review STATUS.md for current state"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Run 'cat .claude/PROJECT_ETHOS.md' for full context"
echo "═══════════════════════════════════════════════════════════"
