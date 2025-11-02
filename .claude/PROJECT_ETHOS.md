# Natural Flow Terminal - Project Ethos & Context

**READ THIS FIRST in every new chat session**

## Core Philosophy

This is NOT another cookie-cutter options flow platform. This is a **pattern learning engine** that filters signal from noise.

### The Vision

**"Let the data tell the story - show historical win rates, not predictions"**

Good examples:
- "AAPL intraday flow bullish BUT smart money quietly building $195 calls for 3 days - divergence suggests fade the crowd"
- "NVDA market selling puts (intraday bearish) while institutions accumulating $500C for 7 days - strong conviction setup"
- "TSLA intraday sentiment flipped bullish 3 hours ago AND matches $250C strike being built - confirmation signal (appeared 23x, 72% bullish)"

Bad examples (avoid):
- "AAPL WILL move up" (we don't predict)
- "1,234 trades today" (meaningless noise)
- Generic sentiment summaries without context

### Key Insight: 90% is Noise

**The real problem:** 90% of options flow is hedging/noise. The alpha is identifying the 10% that actually signals directional moves.

**Our approach:**
- Ingest ALL flow ($50K+ premium, 0-30 DTE)
- Tally/aggregate by strike (not individual trades)
- Surface only the signal (unusual concentration, repeated hits, sentiment flips)
- Track historical win rates for patterns
- Let users decide based on probabilities, not predictions

---

## Architecture Principles

### 1. DUAL DATA STRATEGY (The Key Innovation)

**We track TWO parallel data streams for the same 9 tickers:**

#### **Stream 1: INTRADAY FLOW LINES (Market Context - ALL Flow)**
```
Purpose: Show overall market sentiment (the crowd)
Data: ALL options flow, no filters
Display: Line chart (SpotGamma Hiro / Unusual Whales Market Tide style)
  - Stock price line (white/yellow)
  - Call premium line (green)
  - Put premium line (pink/magenta)
Updates: Real-time throughout trading day
Use case: Day traders, market temperature
```

**This is the SURFACE - what everyone sees.**

#### **Stream 2: SMART MONEY SCORECARD (The Underbelly - Filtered Signal)**
```
Purpose: Show what institutions are building (the signal)
Data: Only $50K+ premium, 0-30 DTE
Display: Strike-level scorecard with multi-day aggregation
  - AAPL $195C: $2.3M (13 hits over 3 days)
  - NVDA $500P: $1.8M (8 hits over 2 days)
Updates: Accumulates over days/weeks
Use case: Swing traders, position building
```

**This is the UNDERBELLY - what smart money is actually doing.**

### The Power of Comparing Both:

**Divergence = Edge:**
- Intraday: Market bearish (puts spiking)
- Smart Money: Institutions buying calls
- → Fade the crowd, follow the money

**Confirmation = Strong Signal:**
- Intraday: Calls dominating
- Smart Money: Same strike being accumulated for days
- → High conviction setup

**The 90% Noise Problem:**
- Intraday lines show EVERYTHING (including 90% hedging)
- Smart money filter strips out the noise
- AI compares them: "Market selling puts, but smart money quietly building $195 calls for 3 days"

### 2. Data Flow Architecture

```
POLYGON WEBSOCKET
    ↓
INGEST: Every trade for 9 tickers
    ↓
FORK INTO TWO STREAMS:
    ↓                           ↓
STREAM 1: ALL FLOW          STREAM 2: FILTERED
(Intraday Lines)            (Smart Money)
    ↓                           ↓
Store ALL trades            Filter: $50K+, 0-30 DTE
Update every 10sec          Aggregate by strike
Display: Line chart         Display: Scorecard
    ↓                           ↓
COMPARE BOTH STREAMS:
    ↓
AI NARRATIVE: "Divergence detected - market bearish but institutions building calls"
    ↓
TRACK OUTCOMES: Which divergences actually predicted moves?
    ↓
LEARN: Build pattern library with historical win rates
```

### 2. Strike-Level Aggregation (Not Trade-Level)

**Critical concept:** We're not tracking millions of individual trades. We're **scoring strikes**.

**Example - Flow comes in:**
```
Trade: AAPL $195 call, $50K premium, 14 DTE
```

**System does NOT:**
- ❌ Create unique record for this trade
- ❌ Show "New $50K AAPL call at 2:34pm"
- ❌ Track this specific contract

**System DOES:**
- ✅ Add $50K to AAPL $195C 12/20 tally
- ✅ Increment hit count: 12 → 13
- ✅ Update last activity timestamp
- ✅ Recalculate flow grade/score
- ✅ Check for unusual patterns

**Result:**
```
AAPL $195 Calls (12/20, 14 DTE)
├─ Total Premium: $2.3M ⬆️ (+$50K)
├─ Hit Count: 13 ⬆️
├─ Flow Grade: A- (bullish conviction)
├─ Last Activity: 2 min ago
└─ Pattern Match: "Heavy call flow, 10+ hits" (appeared 23x, 65% bullish)
```

**Only flag individual trades when:**
- Unusually large ($500K+ single trade)
- First time seeing this strike today
- Concentration spike (strike hit 5x in 10 minutes)
- User manually flags it

### 3. Two-Tier Flagging System

**User Flags (Manual):**
- User sees something interesting and flags it
- AI ALWAYS monitors user-flagged items
- Sacred - never auto-delete

**AI Flags (Autonomous):**
- AI detects patterns automatically
- Tests its own hypotheses
- Learns from outcomes

Both get tracked and validated the same way.

### 4. Data Retention Policy

**Contract Data (Temporary - 60 days max):**
- Track contracts from entry → expiry (natural lifespan)
- Since we only track 0-30 DTE, max storage = 60 days
  - 30 DTE at entry + 30 days to expiry
- After expiry: DELETE raw contract data

**Pattern Knowledge (Permanent - Forever):**
- Store learned patterns permanently
- Example:
  ```
  Pattern: "AAPL $195 calls, 10+ hits, $2M+ premium, 12-15 DTE"
  Occurrences: 23 times
  Outcomes:
    - Stock moved up: 15 (65%)
    - Stock moved down: 6 (26%)
    - No significant move: 2 (9%)
  Average move: +2.3%
  Last seen: 2025-10-15
  ```

**The AI:**
- ✅ Forgets actual trades (wiped after 60 days)
- ✅ Remembers patterns and win rates (stored forever)
- ✅ Updates patterns when seen again

**Think of it like:**
- Raw data = short-term memory (60 days)
- Learned patterns = long-term memory (永久)

### 5. Why These Filters?

**$50K+ premium minimum:**
- Institutional size trades
- Retail doesn't move markets
- Directional conviction (not just hedging)
- Below $50K = noise

**0-30 DTE only:**
- Near-term directional plays
- These are "I think stock moves THIS WEEK" trades
- Ignore >30 DTE (long-term hedging, LEAPS, portfolio protection)
- Even $500K premium at 60 DTE = likely hedging noise

**9 Tickers (MAG7 + SPY + QQQ):**
- AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META (MAG7)
- SPY, QQQ (market indexes)
- These 9 tickers move the entire market
- Focused scope = better pattern learning
- Small enough to build dual streams for each

---

## AI Pattern Learning Philosophy

### What We're NOT Building:
- ❌ Predictive model that says "stock WILL move"
- ❌ Black-box algorithm
- ❌ Over-fitted ML model on sparse data

### What We ARE Building:
- ✅ Historical win rate tracker
- ✅ Pattern recognition engine
- ✅ Signal filter (separate wheat from chaff)
- ✅ Transparent probability display

### How AI Learning Works:

**Phase 1 (Now - Aggregate Patterns):**
- Track aggregate trends: "AAPL calls dominating for 3 days"
- Basic pattern detection: sentiment flips, unusual volume
- AI reads every data point but focuses on trends
- No individual contract tracking yet

**Phase 2 (Later - Stock Movement Correlation):**
- Track stock price movements after flow patterns
- "When this pattern appeared, stock moved +2.3% on average"
- Build historical win rate database
- Still not predicting - just showing history

**Phase 3 (Future - Full Outcome Tracking):**
- Track individual contracts to expiry
- Individual win/loss rates
- "This exact setup: 67% success rate, avg gain +$2,340"
- User can backtest strategies

### The AI's Job:

**Not:** "This trade will be profitable"

**Instead:**
- "This pattern appeared 23 times before"
- "15 times stock moved up (65%)"
- "6 times stock moved down (26%)"
- "2 times no significant move (9%)"
- "Average move when bullish: +2.3%"
- "You decide."

### Pattern Detection Triggers:

AI should auto-flag when it sees:
- Strike concentration (80%+ flow at one strike)
- Repeated hits (same strike hit 5+ times in 2 hours)
- Unusual volume (3x+ historical baseline)
- Sentiment flip (bearish → bullish or vice versa)
- Patterns with historical precedent

Then it **learns** which triggers actually correlate with moves.

---

## Design Aesthetic

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
┌─────────────┬──────────────────────────────────────┬────────────────┐
│   Stock     │   INTRADAY FLOW LINES                │  What's        │
│  Selector   │   (ALL flow - Market Tide style)     │  Happening     │
│   (9 stocks)│   ─── Stock Price (white)            │                │
│             │   ─── Call Premium (green)           │  AI Narrative: │
│   Today's   │   ─── Put Premium (magenta)          │  Compares both │
│   Alerts    │   Updates: Real-time (10sec)         │  streams to    │
│   (Flips &  │                                      │  find edge     │
│   Diverge)  ├──────────────────────────────────────┤                │
│             │   SMART MONEY SCORECARD              │  "Market       │
│   Position  │   (Filtered: $50K+, 0-30 DTE)        │   bearish but  │
│   Building  │   AAPL $195C: $2.3M (13h, 3d) ⚠️     │   smart money  │
│   Alerts    │   NVDA $500P: $1.8M (8h, 2d)         │   building     │
│             │   TSLA $250C: $950K (5h, 1d)         │   calls..."    │
│             │   Accumulates over days/weeks        │                │
└─────────────┴──────────────────────────────────────┴────────────────┘

KEY:
- Top half = Market context (what crowd sees)
- Bottom half = Smart money (what institutions building)
- Right side = AI compares both to find divergence/confirmation
```

---

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
- OpenAI GPT-4 for narrative insights
- Deployed on: **Railway** (auto-deploys from GitHub)
- URL: https://web-production-43dc4.up.railway.app

### Data Source
- Polygon.io (now Massive.com)
- Plan: **Options Developer** ($79/mo)
- Features: WebSocket, unlimited calls, 4 years historical, 15-min delayed
- Credentials: User has API key (not in repo)

---

## What's Been Built

### ✅ Frontend Components (100% Complete)
- [x] Terminal.tsx - Main page with 3-panel layout
- [x] SentimentTide.tsx - Stacked area chart (calls above, puts below zero)
- [x] FlowRiver.tsx - Animated trade bubbles
- [x] Sidebar stock selector (7 stocks with live data)
- [x] Live status bar (net flow, trade count, sentiment)
- [x] What's Happening narrative panel
- [x] Sentiment flip alerts (bullish/bearish crossover detection)

### ✅ Backend Services (95% Complete)
- [x] FlowService.java - Core data ingestion & queries
- [x] PolygonWebSocketService.java - Real-time streaming (READY, needs API key)
- [x] SmartMoneyService.java - $50K+, 0-30 DTE filtering, strike concentration
- [x] MarketPulseService.java - Heatmap, summary, timeline aggregations
- [x] OpenAIService.java - GPT-4 insights endpoint
- [x] HistoricalDataLoader.java - Synthetic test data generator

### ✅ API Endpoints (Working)
```
GET  /api/pulse/mag7-summary          - Overall market stats
GET  /api/pulse/heatmap                - Per-stock call/put breakdown
GET  /api/pulse/smart-money            - $50K+ trades
GET  /api/pulse/timeline               - Hourly buckets
GET  /api/pulse/unusual-activity       - 3x+ volume alerts
GET  /api/flow/insights                - AI-generated ticker insights
POST /api/pulse/load-historical-data   - Synthetic data loader
```

---

## Current State

### Data Status
```
Database: PostgreSQL on Railway
Records: 1,351 trades (ALL SYNTHETIC)
Status: Using test data for UI development
```

**Why no real data?** Missing Railway environment variable:
```
POLYGON_API_KEY = user_needs_to_add_this
POLYGON_WEBSOCKET_ENABLED = true
```

Once added:
1. PolygonWebSocketService auto-starts
2. Connects to wss://delayed.polygon.io/options
3. Subscribes to T.O:AAPL*, T.O:MSFT*, etc.
4. Filters $50K+ and 0-30 DTE client-side
5. Aggregates by strike/expiry
6. Database fills with real flow tallies

---

## Development Roadmap

### Phase 1: Aggregate Flow & Trends (Current)
**Goal:** Get real data flowing and show aggregated strike-level flow

**Tasks:**
- [x] WebSocket streaming setup
- [ ] Add POLYGON_API_KEY to Railway (USER BLOCKER)
- [ ] Verify real data flowing
- [ ] Clear synthetic test data
- [ ] Historical backfill (90 days of flow)
- [ ] Strike-level aggregation display
- [ ] Basic trend detection (sentiment flips, unusual volume)

**AI Capability:**
- "AAPL calls have dominated for 3 days"
- "NVDA $500 strike seeing unusual concentration"
- "TSLA sentiment flipped bullish 2 hours ago"

### Phase 2: Historical Win Rates (Next)
**Goal:** Track what happens after patterns appear

**Tasks:**
- [ ] Store stock prices after patterns detected
- [ ] Calculate outcome statistics (% moved up/down)
- [ ] Build pattern library with win rates
- [ ] Display: "This pattern appeared 23x, 65% bullish"
- [ ] OpenAI integration for narrative context

**AI Capability:**
- "When AAPL $195 calls see 10+ hits, stock moved up 65% of time"
- "Similar NVDA setup preceded +3.2% moves historically"

### Phase 3: Full Contract Tracking (Future)
**Goal:** Track individual contracts to expiry for P&L validation

**Tasks:**
- [ ] Real-time stock price feed integration
- [ ] Track each flagged contract to expiry
- [ ] Calculate P&L for outcomes
- [ ] User can backtest strategies
- [ ] Historical playback mode (date picker)

**AI Capability:**
- "Those AMZN $180 puts we flagged went ITM (+$2,340 profit)"
- "This exact setup: 67% win rate, avg profit $1,850"

---

## User Preferences & Requirements

### Must Haves
- ✅ Professional Bloomberg aesthetic (no consumer app vibes)
- ✅ No emojis anywhere (institutional grade)
- ✅ Focus on MAG7 only (expandable later)
- ✅ $50K+ institutional trades only
- ✅ 0-30 DTE directional plays only
- ✅ Strike-level aggregation (not individual trades)
- ⏳ Historical win rates, not predictions
- ⏳ AI learns from outcomes
- ⏳ Dual flagging (user + AI)

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
- ❌ Predictive claims ("stock WILL move")
- ❌ Individual trade tracking (aggregate by strike instead)

---

## Development Workflow

### Making Changes

1. **Frontend changes:**
   - Edit files in `/src`
   - Lovable auto-deploys on git push

2. **Backend changes:**
   - Edit files in `/backend/src`
   - Railway auto-deploys on git push
   - Check logs in Railway dashboard

3. **Always commit with context:**
   ```bash
   git add .
   git commit -m "Clear description of what changed and why"
   git push origin main
   ```

4. **Update STATUS.md after major changes**

### Common Pitfalls

**DON'T:**
- Track individual trades (aggregate by strike instead)
- Try to predict outcomes (show win rates only)
- Store data forever (60-day rolling window for contracts)
- Suggest polling (use WebSocket)
- Add consumer app features (professional terminal only)

**DO:**
- Aggregate flow by strike/expiry
- Show historical probabilities, not predictions
- Store pattern knowledge permanently
- Filter at ingestion time ($50K+, 0-30 DTE)
- Think "signal filter" not "data display"

---

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

---

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
- Show impact on pattern learning
- Align with project ethos
- Check what exists first
- Update STATUS.md after

---

## Final Notes

This is a **multi-month project** building something unique. It's not about shipping fast - it's about building the RIGHT thing.

**The goal:** Build a signal filter that shows historical probabilities, not a prediction engine.

Every feature should answer: "Does this help filter signal from noise and show what actually works?"

---

**Last Updated**: 2025-11-01
**Version**: 4.0 (DUAL DATA STRATEGY: intraday flow lines + smart money scorecard)
**Next Major Milestone**: Real Polygon data flowing + build intraday flow lines (Market Tide style)
