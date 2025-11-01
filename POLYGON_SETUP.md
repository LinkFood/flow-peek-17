# Polygon.io Real Data Setup

## Current Status
⚠️ **Backend is using 100% synthetic test data**
- No real Polygon data being ingested
- Need to configure Railway environment variables

## What You Need

### 1. Polygon.io API Key
Get your API key from: https://polygon.io/dashboard/api-keys

**Required Subscription Level**:
- Minimum: **Starter** plan ($29/mo) for options data
- Recommended: **Developer** plan ($99/mo) for real-time options flow
- Check that your subscription includes **Options Trades API** access

### 2. Railway Environment Variables

Go to your Railway project dashboard and add these variables:

```bash
POLYGON_API_KEY=your_actual_polygon_api_key_here
POLYGON_ENABLED=true
```

**Important**: No quotes, no spaces around the = sign, just the raw values.

## How It Works

Once configured, the backend will:

1. **Poll every 5 seconds** via `PolygonService.java`
2. **Hit endpoint**: `https://api.polygon.io/v3/trades/options`
3. **Fetch trades** from last poll timestamp to now
4. **Ingest automatically** into PostgreSQL database
5. **Filter MAG7** options only (AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META)

## Expected Results

After enabling:
- **Higher volume**: $1B-$5B+ daily premium on active days (vs current $675M synthetic)
- **Real trades**: Actual institutional flow from the market
- **Live updates**: New trades every 5 seconds
- **Smart money**: $100K+ trades will populate the Flow River
- **Accurate sentiment**: Real bullish/bearish shifts throughout the day

## Testing the Connection

After adding the env vars, Railway will auto-deploy. Check logs:

```bash
# In Railway dashboard, check logs for:
"Successfully ingested X options trades from Polygon"

# If you see this error:
"Polygon API key not configured"
→ The env var isn't set correctly

# If you see this:
"Polygon polling is disabled"
→ POLYGON_ENABLED is not set to true
```

## Manual Test Endpoint

Once live, you can verify data is flowing:

```bash
# Check if new trades are coming in
curl https://web-production-43dc4.up.railway.app/api/pulse/mag7-summary

# Should see totalTrades increasing every few seconds
```

## Clear Synthetic Data

Once real data is flowing, clear the test data:

```bash
curl -X POST "https://web-production-43dc4.up.railway.app/api/pulse/load-historical-data?daysBack=0&clearFirst=true"
```

This will empty the database and let it fill with only real Polygon data.

## Cost Considerations

Polygon API calls:
- **5-second polling** = 720 API calls per hour
- **Options Trades endpoint** typically returns 10-1000 trades per call
- **Storage**: Each trade ~500 bytes, ~100K trades/day = ~50MB/day

Railway costs:
- Database storage grows over time
- Consider adding data retention policy (delete trades older than 30 days)

## Troubleshooting

### "No trades returned"
- Market might be closed (options trade 9:30am-4pm ET, Mon-Fri)
- Check your Polygon subscription includes options data
- Verify API key has correct permissions

### "Rate limit exceeded"
- Polygon Starter plan has rate limits
- Backend is set to 5-second polling (safe for most plans)
- Upgrade to Developer plan for unlimited rate

### "Authentication failed"
- Double-check API key is correct
- No extra spaces or quotes in Railway env var
- Key must have Options Trades API access

## Next Steps

1. ✅ Get your Polygon API key from dashboard
2. ✅ Add both env vars to Railway
3. ✅ Wait for Railway auto-deploy (2-3 minutes)
4. ✅ Check Railway logs for "Successfully ingested"
5. ✅ Verify data in terminal UI
6. ✅ Clear synthetic data once real data flows

---

**Railway Project**: https://railway.app/project/your-project-id
**Polygon Dashboard**: https://polygon.io/dashboard
