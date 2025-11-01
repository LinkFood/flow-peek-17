# Natural Flow Terminal - Project Ethos & Context

**READ THIS FIRST in every new chat session**

## Core Philosophy

This is NOT another cookie-cutter options flow platform. This is a **pattern learning engine** disguised as a flow terminal.

### The Vision

"Show me the STORY, not just the data"

Users should see:
- "Those AMZN $180 puts we flagged 7 days ago are now ITM (+45% gain)"
- "AAPL $195 calls for 12/20 getting hammered - this pattern preceded +3% move on Nov 15"
- "Similar setup occurred Sept 12 - 4/6 success rate historically"

NOT just:
- "AAPL has bearish flow"
- "1,234 trades today"
- Generic sentiment summaries

## Architecture Principles

### 1. Data Strategy
```
ALL RAW FLOW → Store Forever
├── Every trade from Polygon (even small ones)
├── Powers: Market Tide, volume charts, aggregate sentiment
├── Database: PostgreSQL (5GB/year is fine)
└── Never delete (pattern learning needs history)

SMART MONEY FLAGS → Track & Validate
├── Filter: $50K+ premium, 0-30 DTE only
├── Auto-flag: Unusual volume, strike concentration
├── Track outcome: Did flagged trade predict move?
├── Learn: "This pattern → 67% win rate"
└── Store: ~200-500 trades/day

AI ANALYSIS → Real-time Intelligence
├── Watch flow AS IT COMES IN
├── Spot patterns: "Strike getting hit repeatedly"
├── Historical context: "This happened before on X date"
└── Outcome tracking: "Last time this setup → +3% move"
```

### 2. Why These Filters?

**$50K+ premium minimum:**
- Institutional size
- Retail doesn't move markets
- Directional conviction (not just hedging)

**0-30 DTE only:**
- Near-term directional plays
- Ignore >30 DTE (long-term hedging, LEAPS, portfolio protection)
- These are the "I think stock moves THIS WEEK" trades

**MAG7 only (for now):**
- AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META
- These 7 stocks move the entire market
- Focused scope = better pattern learning
- (SPY/QQQ coming later)

### 3. Design Aesthetic

**Bloomberg Terminal vibes:**
- Dark theme (#0a0e14 background)
- Electric cyan accents (#00d4ff)
- Neon green calls (#00ff9d)
- Hot magenta puts (#ff0066)
- Monospace fonts for numbers
- Tight spacing, high information density
- NO EMOJIS (professional, institutional grade)

**Three-panel layout:**
```
┌─────────────┬──────────────────────┬────────────────┐
│   Stock     │   Market Sentiment   │  What's        │
│  Selector   │        Tide          │  Happening     │
│   (MAG7)    │   (Stacked Area)     │ (AI Narrative) │
│             ├──────────────────────┤                │
│   Alerts    │    Flow River        │   Stock        │
│   (Flips)   │   (Animated)         │   Analysis     │
│             ├──────────────────────┤                │
│             │  Trade Table         │                │
│             │  ($100K+ only)       │                │
└─────────────┴──────────────────────┴────────────────┘
```

## Technology Stack

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS (custom terminal theme in index.css)
- TanStack Query (10-second refetch intervals)
- Recharts (for sentiment tide)
- Deployed on: **Lovable** (auto-deploys from GitHub)
- Repo: LinkFood/flow-peek-17

### Backend
- Java 17 + Spring Boot 3.2.1
- PostgreSQL on Railway
- OkHttp for Polygon WebSocket
- OpenAI GPT-4 for insights
- Deployed on: **Railway** (auto-deploys from GitHub)
- URL: https://web-production-43dc4.up.railway.app

### Data Source
- Polygon.io (now Massive.com)
- Plan: **Options Developer** ($79/mo)
- Features: WebSocket, unlimited calls, 4 years historical, 15-min delayed
- Credentials: User has API key (not in repo)

## What's Been Built

### ✅ Frontend Components (100% Complete)
- [x] Terminal.tsx - Main page with 3-panel layout
- [x] SentimentTide.tsx - Stacked area chart (calls above, puts below zero)
- [x] FlowRiver.tsx - Animated trade bubbles flowing left-to-right
- [x] Sidebar stock selector (7 stocks with live data)
- [x] Live status bar (net flow, trade count, sentiment)
- [x] What's Happening narrative panel
- [x] Sentiment flip alerts (bullish/bearish crossover detection)

### ✅ Backend Services (95% Complete)
- [x] FlowService.java - Core data ingestion & queries
- [x] PolygonService.java - REST polling (DEPRECATED, use WebSocket)
- [x] PolygonWebSocketService.java - Real-time streaming (PREFERRED)
- [x] SmartMoneyService.java - $50K+, 0-30 DTE filtering, strike concentration
- [x] MarketPulseService.java - Heatmap, summary, timeline aggregations
- [x] OpenAIService.java - GPT-4 insights endpoint
- [x] HistoricalDataLoader.java - Synthetic test data generator

### ✅ API Endpoints (Working)
```
GET  /api/pulse/mag7-summary          - Overall market stats
GET  /api/pulse/heatmap                - Per-stock call/put breakdown
GET  /api/pulse/smart-money            - $100K+ trades (currently empty)
GET  /api/pulse/timeline               - Hourly buckets (BROKEN - returns empty)
GET  /api/pulse/unusual-activity       - 3x+ volume alerts
GET  /api/flow/insights                - AI-generated ticker insights
POST /api/pulse/load-historical-data   - Synthetic data loader
```

### ⚠️ Built But Not Active
- [ ] Polygon WebSocket streaming (needs API key in Railway)
- [ ] Real data ingestion (still using synthetic test data)
- [ ] OpenAI real-time analysis (service exists, not called)
- [ ] Strike concentration API (logic exists, no endpoint)

### 🔴 Not Started
- [ ] Historical backfill (90 days of real data)
- [ ] Historical playback mode (date picker to time-travel)
- [ ] Outcome tracking (flag → result validation)
- [ ] Pattern learning display ("this happened before")
- [ ] Keyboard shortcuts (1-9 for stock selection)
- [ ] Activity glow effects (visual indicators for hot stocks)

## Current State

### Data Status (as of last check)
```
Database: PostgreSQL on Railway
Records: 3,384 trades (ALL SYNTHETIC)
Date Range: Last 7 days
Premium: $326M calls, $349M puts
Net Flow: -$22.7M (slightly bearish)
```

**IMPORTANT**: This is 100% fake test data for UI development. No real Polygon data yet.

### Why No Real Data?
Missing Railway environment variable:
```
POLYGON_API_KEY = user_needs_to_add_this
```

Once added:
1. PolygonWebSocketService auto-starts
2. Connects to wss://delayed.polygon.io/options
3. Subscribes to T.O:AAPL*, T.O:MSFT*, etc.
4. Filters $50K+ and 0-30 DTE client-side
5. Stores ~200-500 smart money trades/day
6. Database fills with real institutional flow

## Known Issues

### 1. Timeline Endpoint Broken
```
GET /api/pulse/timeline?symbol=AAPL
→ Returns empty array (backend query bug)
```
Impact: Sentiment tide chart may have issues
Fix needed: Debug MarketPulseService.getTimeline()

### 2. Smart Money Returns Empty
```
GET /api/pulse/smart-money
→ Returns 0 trades
```
Why: Synthetic data doesn't have many $100K+ trades
Fix: Will resolve when real Polygon data flows

### 3. Flow River Shows "Waiting for flow"
Why: No $100K+ trades to animate
Fix: Will resolve when real data flows

## User Preferences & Requirements

### Must Haves
- ✅ Professional Bloomberg aesthetic (no consumer app vibes)
- ✅ No emojis anywhere (institutional grade)
- ✅ Focus on MAG7 only (expandable later)
- ✅ $50K+ institutional trades only
- ✅ 0-30 DTE directional plays only
- ⏳ Historical context for pattern learning
- ⏳ Outcome tracking ("those puts went ITM")
- ⏳ AI says "AAPL $195 calls getting hit" (specific strikes)

### Nice to Haves
- SPY and QQQ (9 stocks total)
- Keyboard shortcuts
- Historical playback mode
- Dark pool integration
- Custom alerts

### Explicitly Rejected
- ❌ Tracking ALL tickers (too noisy)
- ❌ Small retail trades (<$50K)
- ❌ Far-dated options (>30 DTE hedging)
- ❌ Cookie-cutter flow platform aesthetics
- ❌ Emojis in the UI

## Development Workflow

### Making Changes

1. **Frontend changes:**
   - Edit files in `/src`
   - Lovable auto-deploys on git push
   - Check: https://lovable.app/your-project

2. **Backend changes:**
   - Edit files in `/backend/src`
   - Railway auto-deploys on git push
   - Check logs in Railway dashboard
   - Test: curl https://web-production-43dc4.up.railway.app/api/pulse/mag7-summary

3. **Always commit with context:**
   ```bash
   git add .
   git commit -m "Clear description of what changed and why"
   git push origin main
   ```

4. **Update STATUS.md after major changes**

### Testing Real Data
```bash
# 1. Check if synthetic data present
curl https://web-production-43dc4.up.railway.app/api/pulse/mag7-summary

# 2. Clear synthetic data (once real data flows)
curl -X POST "https://web-production-43dc4.up.railway.app/api/pulse/load-historical-data?daysBack=0&clearFirst=true"

# 3. Verify real data flowing
# (trade count should increase every few seconds during market hours)
```

### Common Pitfalls

**DON'T:**
- Suggest polling Polygon every 5 seconds (use WebSocket)
- Try to store every single options trade (millions/day)
- Add consumer app features (this is professional terminal)
- Remove historical data (pattern learning needs it)
- Use REST API when WebSocket is better

**DO:**
- Check STATUS.md before starting new features
- Filter at ingestion time ($50K+, 0-30 DTE)
- Keep Bloomberg terminal aesthetic
- Think "pattern learning" not "data display"
- Update STATUS.md when you complete something

## Next Session Checklist

When starting a new chat:

1. **Read this file first** (PROJECT_ETHOS.md)
2. **Read STATUS.md** for current state
3. **Ask user: "What's the priority today?"**
4. **Don't assume - check git log** for recent changes
5. **Don't rebuild what exists** - check /backend/src and /src first

## Key Files to Check

### Before suggesting frontend changes:
```
/src/pages/Terminal.tsx          - Main page
/src/components/SentimentTide.tsx - Tide chart
/src/components/FlowRiver.tsx     - Animation
/src/lib/api.ts                   - API client
/src/lib/sentimentFlip.ts         - Flip detection
/src/lib/narrativeEngine.ts       - AI narrative
/src/index.css                    - Theme colors
```

### Before suggesting backend changes:
```
/backend/src/main/java/com/naturalflow/service/
  - PolygonWebSocketService.java  (streaming)
  - SmartMoneyService.java        (filtering)
  - MarketPulseService.java       (aggregations)
  - OpenAIService.java            (insights)
  - FlowService.java              (core data)

/backend/src/main/resources/application.yml  (config)
```

### Before making claims:
```
STATUS.md           - What's actually done vs planned
POLYGON_SETUP.md    - Polygon integration guide
WEBSOCKET_SETUP.md  - WebSocket streaming guide
README.md           - Project overview
```

## Success Metrics

### Short Term (Week 1)
- [ ] Real Polygon data flowing via WebSocket
- [ ] Database has 90 days of historical smart money trades
- [ ] AI can reference historical patterns
- [ ] Smart money endpoint showing $50K+, 0-30 DTE trades

### Medium Term (Month 1)
- [ ] Outcome tracking working ("flagged puts went ITM")
- [ ] Historical playback mode functional
- [ ] Strike-level AI insights ("$195 calls getting hit")
- [ ] Pattern learning: "This setup has 67% win rate"

### Long Term (Month 3)
- [ ] User can backtest strategies
- [ ] AI learns which patterns actually work
- [ ] Platform becomes pattern learning edge
- [ ] Users say "this is better than Unusual Whales"

## Communication Guidelines

### When talking to user:
- Be direct and technical (they're technical)
- Don't over-explain basics
- Show code snippets, not paragraphs
- Ask clarifying questions early
- Don't assume - check git history first

### When you don't know:
- Check the repo (git log, ls files)
- Check STATUS.md
- Check API endpoints with curl
- Ask user directly
- Don't make up answers

### When suggesting changes:
- Explain WHY, not just WHAT
- Show the impact on pattern learning
- Align with project ethos
- Check what exists first
- Update STATUS.md after

## Final Notes

This is a **multi-month project** building something unique. It's not about shipping fast - it's about building the RIGHT thing.

The user has:
- Technical background
- Clear vision
- Polygon Options Developer plan ($79/mo)
- Patience for quality over speed

The goal is **pattern learning intelligence**, not just "another flow platform."

Every feature should answer: "Does this help users learn what flow patterns actually predict moves?"

---

**Last Updated**: 2025-11-01
**Version**: 2.0 (post-WebSocket implementation)
**Next Major Milestone**: Real Polygon data flowing + 90-day historical backfill
