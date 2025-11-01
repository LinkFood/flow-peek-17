# Polygon WebSocket Real-Time Setup

## What Changed

**BEFORE**: REST API polling every 5 seconds
- ❌ 17,280 API calls per day
- ❌ Missed trades between polls
- ❌ Higher latency

**AFTER**: WebSocket streaming
- ✅ Single persistent connection
- ✅ Real-time trade stream (15-min delayed)
- ✅ Smart filtering: $50K+ premium, 0-30 DTE only
- ✅ ~200-500 trades/day stored (not millions)

## How It Works

### Connection Flow:
```
1. Connect to wss://delayed.polygon.io/options
2. Authenticate with API key
3. Subscribe to: T.O:AAPL*, T.O:MSFT*, T.O:GOOGL*, etc.
4. Receive real-time trade stream
5. Filter client-side:
   - Premium >= $50K
   - DTE <= 30 days
6. Store only smart money trades
```

### Smart Filtering Pipeline:

```
POLYGON STREAM
  ↓ (all MAG7 options trades)
FILTER: Premium >= $50K
  ↓ (drops ~95% of trades)
FILTER: DTE <= 30 days
  ↓ (drops another ~50%)
STORE: ~200-500 trades/day
  ↓
DATABASE: PostgreSQL
```

## Railway Environment Variables

Add these to your Railway backend service:

```bash
POLYGON_API_KEY=your_polygon_api_key_here
POLYGON_WEBSOCKET_ENABLED=true
```

**Note**: The old `POLYGON_ENABLED=true` is no longer needed (that was for REST polling).

## What Gets Stored

**Smart Money Trades:**
- Ticker: AAPL, MSFT, etc.
- Strike: $190, $500, etc.
- Expiry: 12/20/2024
- Side: CALL or PUT
- Premium: $50K-$5M+
- DTE: 0-30 days
- Timestamp: When it traded

**What We DON'T Store:**
- Small retail trades (<$50K)
- Far-dated hedging (>30 DTE)
- Non-MAG7 tickers

## Expected Volume

With your **Options Developer** plan:
- **Raw stream**: ~5,000-20,000 MAG7 options trades/day
- **After $50K filter**: ~500-1,000 trades/day
- **After 0-30 DTE filter**: ~200-500 trades/day
- **Storage**: ~100KB/day = 3MB/month = tiny

## Benefits for AI Analysis

The AI can now say things like:

> "AAPL $195 calls for 12/20 (14 DTE) just saw $850K premium hit in last 30 minutes - unusual concentration. Last time this happened on Nov 15, stock moved +3% next day."

Because we're storing:
- Strike-level concentration
- Repeated hits on same strikes
- Historical outcomes
- DTE at time of trade

## Monitoring

Check Railway logs for:

```
✅ Authenticated successfully!
📡 Subscribed to MAG7 options flow
💰 Smart Money: O:AAPL251220C00190000 $85000 premium, 14 DTE
```

If you see errors:
- `WebSocket connection failed` → Check API key
- `Authentication failed` → API key invalid
- `No smart money detected` → Market closed or low volume day

## Historical Backfill (Next Step)

Once WebSocket is running, we'll backfill 90 days of historical data using REST API:

```bash
# For each MAG7 ticker:
GET /v3/trades/O:AAPL*?timestamp.gte=90_days_ago&limit=50000

# Filter for $50K+ and 0-30 DTE
# Store for pattern learning
```

This gives AI training data to say "this pattern happened before."

## Cost Comparison

**Old Approach (REST polling):**
- 17,280 API calls/day
- Unlimited but wasteful

**New Approach (WebSocket):**
- 1 persistent connection
- Only stores what matters
- Clean, efficient, professional

## Testing

After deploying, verify it's working:

```bash
# Check if smart money is being detected
curl https://web-production-43dc4.up.railway.app/api/pulse/smart-money?limit=10

# Should see recent $50K+ trades with 0-30 DTE
```

---

**Your Options Developer plan is perfect for this.** You have everything needed:
- ✅ WebSocket access
- ✅ Unlimited API calls
- ✅ 4 years historical (for backfill)
- ✅ All the data we need
