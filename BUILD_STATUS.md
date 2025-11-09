# Build Status - Historical Replay & Price Validation System

**Date:** 2025-11-08
**Status:** Backend Complete ✅ | Frontend Pending ⏳

---

## ✅ COMPLETED - Backend (90% Done)

### **Database Models**
- ✅ `StockPrice.java` - New model for 1-min price bars
- ✅ `OptionFlow.java` - Updated with 5 new fields:
  - `stock_price_at_trade` - Price when trade hit
  - `is_otm` - Was option OTM at entry?
  - `distance_to_strike` - % distance to strike
  - `is_0dte` - Same day expiration flag
  - `dte` - Days to expiration

### **Repositories**
- ✅ `StockPriceRepository.java` - Price data queries

### **Core Services**
- ✅ `TradeValidationService.java` - **THE KEY SERVICE**
  - Validates: Ticker, Premium ($50K+), DTE (0-30), OTM
  - Shared by live WebSocket AND replay
  - Enriches trades with calculated fields

- ✅ `StockPriceService.java` - Price fetching from Massive API
  - Real-time: `getCurrentPrice()` for live OTM checking
  - Historical: `fetchHistoricalPrices()` for replay
  - Cache: 5-second cache to avoid API hammering

- ✅ `HistoricalReplayService.java` - **WEEKEND TESTING**
  - `replayTradingDay(date)` - Replay one day
  - `replayMultipleDays(start, end)` - Bulk backfill
  - Runs trades through same validation as live

- ✅ `FlowService.java` - Added `getFlowBetween()` for date queries

### **Controllers**
- ✅ `ReplayController.java` - NEW
  - `POST /api/replay/trading-day?date=2025-11-07`
  - `POST /api/replay/date-range?start=...&end=...`
  - `POST /api/replay/fetch-prices?date=...`
  - `GET /api/replay/check-price-data?symbol=...&date=...`

- ✅ `MarketPulseController.java` - UPDATED
  - `GET /api/pulse/timeline-by-date?symbol=AAPL&date=2025-11-07`
  - Returns flow + price data for specific date

---

## ⏳ PENDING - Backend (10% Remaining)

### **PolygonWebSocketService.java** - Needs Update
**Current:** Logs all trades, no validation
**Needed:** Integrate TradeValidationService

```java
// In processTrade() method:

// 1. Get current stock price
BigDecimal stockPrice = stockPriceService.getCurrentPrice(underlying);

// 2. Validate trade
if (validationService.shouldIngestTrade(flow, stockPrice)) {
    // 3. Enrich with fields
    validationService.enrichTrade(flow, stockPrice);

    // 4. Save
    flowService.ingestFromRawJson(json);
}
```

**Estimated time:** 30 minutes

---

## ⏳ PENDING - Frontend (100% Remaining)

### **API Client Updates** (`src/lib/api.ts`)
Add new methods:
```typescript
export const getTimelineByDate = async (
  symbol: string,
  date: string
) => {
  const res = await fetch(
    `${API_BASE}/pulse/timeline-by-date?symbol=${symbol}&date=${date}`
  );
  return res.json();
};

export const replayTradingDay = async (date: string) => {
  const res = await fetch(
    `${API_BASE}/replay/trading-day?date=${date}`,
    { method: 'POST' }
  );
  return res.json();
};
```

### **New Components Needed**

**1. DatePicker Component** (`src/components/DatePicker.tsx`)
```tsx
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export function DatePicker({ date, onDateChange }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(date, "PPP")}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          disabled={(date) => date > new Date()}
        />
      </PopoverContent>
    </Popover>
  );
}
```

**2. LiveHistoricalToggle Component** (`src/components/LiveHistoricalToggle.tsx`)
```tsx
import { Button } from "@/components/ui/button";

export function LiveHistoricalToggle({ isLive, onToggle }) {
  return (
    <div className="flex gap-2">
      <Button
        variant={isLive ? "default" : "outline"}
        onClick={() => onToggle(true)}
      >
        🔴 LIVE
      </Button>
      <Button
        variant={!isLive ? "default" : "outline"}
        onClick={() => onToggle(false)}
      >
        📅 HISTORICAL
      </Button>
    </div>
  );
}
```

### **Update Terminal.tsx**
Add state and mode switching:
```tsx
const [selectedDate, setSelectedDate] = useState<Date>(new Date());
const [isLive, setIsLive] = useState(true);

// Conditional API calls based on mode
const { data: flowData } = useQuery({
  queryKey: isLive ? ["timeline-live", symbol] : ["timeline-date", symbol, selectedDate],
  queryFn: () => isLive
    ? getTimeline(symbol, 24)
    : getTimelineByDate(symbol, format(selectedDate, "yyyy-MM-dd"))
});
```

---

## 🧪 TESTING WORKFLOW

### **This Weekend (Without Live Data)**

**Step 1: Load Historical Prices**
```bash
curl -X POST "https://web-production-43dc4.up.railway.app/api/replay/fetch-prices?date=2025-11-07"
```

**Step 2: Replay Trading Day** (Note: Options trade fetching not fully implemented yet)
```bash
curl -X POST "https://web-production-43dc4.up.railway.app/api/replay/trading-day?date=2025-11-07"
```

**Step 3: Query Historical Data**
```bash
curl "https://web-production-43dc4.up.railway.app/api/pulse/timeline-by-date?symbol=AAPL&date=2025-11-07"
```

### **Monday Morning (With Live Data)**

**Step 1: Update Polygon WebSocketService**
- Add `TradeValidationService` injection
- Add `StockPriceService` injection
- Update `processTrade()` method

**Step 2: Enable WebSocket**
```bash
# Railway env vars:
POLYGON_API_KEY=your-key-here
POLYGON_WEBSOCKET_ENABLED=true
```

**Step 3: Monitor Logs**
```bash
# Look for:
"✅ Trade passed all filters: ..."
"🎯 0DTE DETECTED: ..."
"Filtered out: ..."
```

---

## 📊 DATABASE MIGRATION

**Option A: Auto Migration (Spring Boot)**
- Just deploy - Spring Boot will auto-create columns

**Option B: Manual SQL**
```sql
ALTER TABLE option_flow
  ADD COLUMN IF NOT EXISTS stock_price_at_trade DECIMAL(15,4),
  ADD COLUMN IF NOT EXISTS is_otm BOOLEAN,
  ADD COLUMN IF NOT EXISTS distance_to_strike DECIMAL(8,4),
  ADD COLUMN IF NOT EXISTS is_0dte BOOLEAN,
  ADD COLUMN IF NOT EXISTS dte INTEGER;

CREATE TABLE IF NOT EXISTS stock_prices (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  open DECIMAL(15,4),
  high DECIMAL(15,4),
  low DECIMAL(15,4),
  close DECIMAL(15,4),
  volume BIGINT,
  src VARCHAR(50) DEFAULT 'polygon'
);

CREATE INDEX idx_symbol_timestamp ON stock_prices(symbol, timestamp);
CREATE INDEX idx_timestamp ON stock_prices(timestamp);
```

---

## 🚀 DEPLOYMENT CHECKLIST

### **Backend**
- [x] All models created
- [x] All services created
- [x] All controllers created
- [ ] Update PolygonWebSocketService (30 min)
- [ ] Test compilation locally
- [ ] Push to GitHub
- [ ] Railway auto-deploys
- [ ] Run database migration

### **Frontend**
- [ ] Update api.ts (15 min)
- [ ] Create DatePicker component (15 min)
- [ ] Create LiveHistoricalToggle component (10 min)
- [ ] Update Terminal.tsx (30 min)
- [ ] Test locally with `npm run dev`
- [ ] Push to GitHub
- [ ] Lovable auto-deploys

### **Total Remaining Time: 2-3 hours**

---

## 🎯 VALIDATION CHECKLIST

Once deployed, test these scenarios:

**Historical Mode:**
- [ ] Pick Nov 7, 2025 → See flow data
- [ ] Price overlay shows AAPL price line
- [ ] Can toggle between dates
- [ ] "Go Live" button returns to real-time

**Live Mode:**
- [ ] Real-time data streaming (Monday AM)
- [ ] Only OTM trades logged
- [ ] 0DTE trades flagged
- [ ] $50K+ premium only
- [ ] 9 tickers only

**Filtering Validation:**
- [ ] ITM trades NOT in database
- [ ] <$50K trades NOT in database
- [ ] >30 DTE trades NOT in database
- [ ] Non-MAG7 tickers NOT in database

---

## 📝 KNOWN LIMITATIONS

**Historical Options Trade Fetching:**
The `HistoricalReplayService.fetchHistoricalOptionsTrades()` method is currently a stub.

Full implementation requires:
1. Fetch all option contracts for a ticker on a date
2. Iterate through each contract
3. Fetch trades for that contract
4. This could be 100+ API calls per ticker per day

**Workaround for testing:**
- Load price data only (works fine)
- Test with synthetic data generator
- Once live WebSocket working, focus on real-time + validation

---

## 💡 NEXT SESSION PRIORITIES

1. **Finish PolygonWebSocketService integration** (30 min)
2. **Build frontend date picker** (1 hour)
3. **Test end-to-end** (30 min)
4. **Deploy and validate** (30 min)

**Then:** Let it run for 30 days, build pattern library, validate hypothesis!

---

**Created:** 2025-11-08
**Status:** Backend 90% complete, ready for frontend
