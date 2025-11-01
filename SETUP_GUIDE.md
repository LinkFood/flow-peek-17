# 🚀 Natural Flow - Complete Setup Guide

Your complete options flow system with Polygon API and OpenAI integration.

## 📋 What You Have

### Backend (`/backend`)
- ✅ **PolygonService** - Auto-polls Polygon API every 5 seconds
- ✅ **OpenAIService** - Generates AI insights for tickers and market
- ✅ **REST API** - 7 endpoints for flow data and AI insights
- ✅ **PostgreSQL Storage** - Stores all data with raw JSON preservation
- ✅ **Scheduled Tasks** - Auto-ingestion enabled

### Frontend (`/src`)
- ✅ **Dashboard** - Latest flows and summary cards
- ✅ **Ticker View** - Position building analysis
- ✅ **AI Insights** - Real OpenAI analysis (NEW!)
- ✅ **Auto-refresh** - Updates every 30 seconds

## 🔑 Required API Keys

You need **TWO** API keys:

### 1. Polygon.io API Key
**Get it:** https://polygon.io/dashboard/api-keys
- Sign up for free tier or paid plan
- Copy your API key

### 2. OpenAI API Key
**Get it:** https://platform.openai.com/api-keys
- Create an account
- Create new API key
- Copy the key (you won't see it again!)

## ⚙️ Configuration

### Step 1: Set Environment Variables

```bash
# Required
export POLYGON_API_KEY=your_actual_polygon_api_key_here
export OPENAI_API_KEY=sk-your_actual_openai_key_here

# Optional
export POLYGON_ENABLED=true  # Enable auto-polling (default: false)
export OPENAI_MODEL=gpt-4    # or gpt-3.5-turbo (default: gpt-4)
```

### Step 2: Database Setup

**Option A: H2 In-Memory (Quick Test)**
- No setup needed!
- Data disappears when you restart
- Perfect for testing

**Option B: PostgreSQL (Production)**
```bash
# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL
brew services start postgresql@16

# Create database
createdb naturalflow

# Schema auto-created by Spring Boot
```

## 🚀 Running the System

### Terminal 1: Start Backend

```bash
cd ~/flow-peek-17/backend

# Set your API keys first!
export POLYGON_API_KEY=your_key
export OPENAI_API_KEY=your_key
export POLYGON_ENABLED=true

# Run backend
mvn spring-boot:run
```

**Look for:**
```
Started NaturalFlowApplication in X seconds
Scheduling enabled
```

If `POLYGON_ENABLED=true`, you'll see:
```
Polling Polygon: 2025-10-31...
Successfully ingested X options trades from Polygon
```

### Terminal 2: Start Frontend

```bash
cd ~/flow-peek-17

# Install dependencies (first time only)
npm install

# Start frontend
npm run dev
```

Open: **http://localhost:5173**

## 📊 Using the Application

### 1. Dashboard (/)
- **Summary Cards** - Call/Put premium totals
- **Latest Flows** - Most recent options trades
- **Auto-updates** every 30 seconds

### 2. Ticker View (/ticker)
- **Position Building** - High premium flows
- **Flow Direction** - Call vs Put analysis
- **Signals** - AI-detected patterns

### 3. AI Insights (/ai-insights) ⭐ NEW!
- **Ticker Analysis** - Deep dive on specific symbols
- **Market Overview** - Sentiment across all tickers
- **OpenAI Powered** - Professional trader analysis

## 🧪 Testing Without API Keys

### Test Backend Only
```bash
cd ~/flow-peek-17/backend
mvn spring-boot:run
```

Then use the test data script:
```bash
cd backend
./test-data.sh
```

### Test Frontend
Frontend works fine without real data - it shows empty states with helpful messages.

## 🔍 API Endpoints

### Flow Data
- `GET /api/flow/latest?symbol=QQQ&limit=50`
- `GET /api/flow/summary?symbol=QQQ&windowHours=24`
- `GET /api/flow/building?symbol=QQQ&minPremium=50000`
- `GET /api/flow/tickers`
- `POST /api/flow/ingest`

### AI Insights (NEW!)
- `GET /api/flow/insights?symbol=QQQ&windowHours=24`
- `GET /api/flow/market-insights`

## 📁 Data Storage

### Where is data stored?

**H2 (Local Dev):**
- In-memory - disappears on restart
- Console: http://localhost:8080/h2-console
- JDBC URL: `jdbc:h2:mem:naturalflow`
- Username: `sa`, Password: (blank)

**PostgreSQL (Production):**
- Persistent storage
- Database: `naturalflow`
- Table: `option_flow`
- Indexes on: `underlying`, `ts_utc`, `premium`

### What data is stored?

**For EVERY options trade:**
- ✅ Complete raw JSON from Polygon
- ✅ Parsed fields (underlying, strike, expiry, side, premium, size)
- ✅ Timestamp
- ✅ Source identifier

**Nothing is lost!** Even if field parsing fails, raw JSON is always saved.

## 🎯 Polygon API Details

### What it polls:
- **Endpoint:** `https://api.polygon.io/v3/trades/options`
- **Frequency:** Every 5 seconds (configurable)
- **Fields:** Uses Polygon API v3 structure
- **Symbol Format:** OCC format (e.g., `O:AAPL251219C00150000`)

### How it parses:
1. Extracts `sip_timestamp` or `participant_timestamp`
2. Parses OCC symbol to get:
   - Underlying ticker
   - Call/Put side
   - Strike price
   - Expiration date
3. Calculates premium: `price × size × 100`
4. Stores everything in database

## 🤖 OpenAI Integration

### What it analyzes:

**Ticker Insights:**
- Overall sentiment (bullish/bearish/neutral)
- Notable large trades
- Potential strategies
- Key levels to watch

**Market Insights:**
- Top 10 most active tickers
- Market-wide sentiment
- Institutional activity patterns
- Trading opportunities

### How it works:
1. Gathers flow data from database
2. Calculates statistics (call/put ratios, avg premiums, etc.)
3. Builds detailed prompt for OpenAI
4. GPT-4 analyzes and provides professional insights
5. Returns formatted analysis to frontend

### Cost:
- GPT-4: ~$0.03-0.10 per analysis (depending on data volume)
- GPT-3.5-turbo: ~$0.001-0.005 per analysis
- Insights are cached for 5-10 minutes to reduce costs

## 🛠️ Troubleshooting

### "Polygon API key not configured"
```bash
# Make sure you exported the key
echo $POLYGON_API_KEY

# If empty, export it
export POLYGON_API_KEY=your_key
```

### "OpenAI API key not configured"
```bash
# Check the key
echo $OPENAI_API_KEY

# Export if needed
export OPENAI_API_KEY=sk-your_key
```

### "Polygon polling is disabled"
```bash
# Enable polling
export POLYGON_ENABLED=true

# Restart backend
```

### "No flow data available"
**Options:**
1. Wait for Polygon to ingest data (if enabled)
2. Use test-data.sh to add sample data
3. Manually POST to `/api/flow/ingest`

### "Error loading insights"
**Check:**
1. OpenAI API key is valid
2. You have OpenAI API credits
3. Backend is running
4. There's actual flow data in database

### Port already in use
```bash
# Check what's using port 8080
lsof -i :8080

# Kill it if needed
kill -9 <PID>
```

## 📈 What Happens When Running

### With Polygon Enabled:
1. ✅ Backend starts
2. ✅ Connects to database
3. ✅ Starts polling Polygon every 5s
4. ✅ Ingests new trades automatically
5. ✅ Frontend shows real live data!

### With OpenAI Enabled:
1. ✅ Click "Refresh Analysis" in AI Insights
2. ✅ Backend queries flow data
3. ✅ Sends to OpenAI with detailed prompt
4. ✅ OpenAI analyzes patterns
5. ✅ Returns professional insights

## 🚂 Cloud Deployment (Recommended)

**Don't want to run locally?** Deploy to Railway for free cloud hosting!

See **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)** for step-by-step instructions.

**Quick Start:**
1. Sign up at https://railway.app (free tier, no credit card)
2. Deploy from your GitHub repo
3. Add PostgreSQL database
4. Set environment variables (API keys)
5. Get your public URL in ~20 minutes

Benefits:
- ✅ No local backend needed
- ✅ 24/7 uptime with free tier
- ✅ Auto-deploys from GitHub
- ✅ Built-in PostgreSQL
- ✅ Easy environment variable management

## 🎓 Next Steps

### 1. Optimize Polling
Edit `PolygonService.java`:
```java
@Scheduled(fixedRate = 10000) // Change to 10 seconds
```

### 2. Add Filters
Filter specific tickers, only high-value trades, etc.

### 3. Add Alerts
Email/SMS when unusual flow detected

### 4. Export Data
Add CSV/Excel export functionality

### 5. Add Charts
Use Recharts to visualize flow over time

## 🔐 Security Notes

- ⚠️ Never commit API keys to Git
- ⚠️ Use environment variables in production
- ⚠️ Enable `naturalflow.security.enabled=true` for production
- ⚠️ Set strong `naturalflow.security.api-key` value

## 💰 Cost Estimates

**Free Tier:**
- Polygon: Limited requests/month
- OpenAI: $5 free credit initially

**Paid:**
- Polygon Starter: $29/month (5 requests/second)
- Polygon Advanced: $99-$399/month (unlimited)
- OpenAI: Pay-as-you-go (~$20-50/month for moderate use)

## 📚 Resources

- **Polygon Docs:** https://polygon.io/docs/options
- **OpenAI Docs:** https://platform.openai.com/docs
- **Spring Boot:** https://spring.io/projects/spring-boot
- **React Query:** https://tanstack.com/query

## ✅ Quick Checklist

Before running:
- [ ] Polygon API key obtained
- [ ] OpenAI API key obtained
- [ ] Environment variables set
- [ ] Backend compiles (`mvn clean install`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Database ready (H2 auto or PostgreSQL created)

Running:
- [ ] Backend started and shows "Started NaturalFlowApplication"
- [ ] Frontend started on port 5173
- [ ] Can access Dashboard at http://localhost:5173
- [ ] Backend logs show Polygon polling (if enabled)
- [ ] Can generate AI insights

---

**You're all set!** 🚀 Your Natural Flow system is ready to track real options flow with AI-powered insights.
