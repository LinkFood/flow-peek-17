# Backend Integration - Natural Flow

Your Lovable frontend is now connected to the Natural Flow backend API.

## What Changed

### New Files
- `src/lib/api.ts` - API client for Natural Flow backend
- `.env.local` - Backend API URL configuration
- `.env.example` - Template for environment variables

### Updated Files
- `src/pages/Dashboard.tsx` - Now fetches real data from `/latest` and `/summary`
- `src/pages/TickerView.tsx` - Now fetches real data from `/building` and `/summary`

## API Client (`src/lib/api.ts`)

### Functions Available

```typescript
// Get latest flow events
await getLatestFlow(symbol: string, limit?: number)

// Get call/put summary
await getSummary(symbol: string, windowHours?: number)

// Get position building flows
await getBuildingFlow(symbol: string, minPremium?: number, lookbackMinutes?: number)

// Get available tickers
await getTickers()

// Ingest new flow data
await ingestFlow(data: any)
```

### TypeScript Types

```typescript
interface OptionFlowResponse {
  tsUtc: string;
  optionSymbol: string;
  side: "CALL" | "PUT";
  premium: number;
  expiry: string;
  strike: number;
  size: number;
  action?: string;
}

interface SummaryResponse {
  symbol: string;
  windowHours: number;
  totalCallPremium: number;
  totalPutPremium: number;
  netPremium: number;
  count: number;
}

interface BuildingFlowResponse {
  id: number;
  tsUtc: string;
  underlying: string;
  optionSymbol: string;
  side: "CALL" | "PUT";
  premium: number;
  strike: number;
  expiry: string;
  size: number;
}
```

## React Query Integration

Both pages use React Query for:
- Automatic refetching every 30 seconds
- Loading states
- Error handling
- Request caching

Example from Dashboard:
```typescript
const { data: latestData, isLoading } = useQuery({
  queryKey: ["latest-flow", ticker],
  queryFn: () => getLatestFlow(ticker, 50),
  refetchInterval: 30000, // 30 seconds
});
```

## Environment Variables

The API URL is configured via environment variable:

```bash
# .env.local
VITE_API_URL=http://localhost:8080/api/flow
```

For production, update this to your deployed backend URL:

```bash
# Production
VITE_API_URL=https://your-backend.railway.app/api/flow
```

## Running Locally

### Prerequisites
1. Backend must be running on `http://localhost:8080`
2. Backend must have data (run `test-data.sh`)

### Start Frontend
```bash
npm install  # First time only
npm run dev
```

Open http://localhost:5173

## Features by Page

### Dashboard (`/`)
**Data Sources:**
- Summary cards: `GET /api/flow/summary`
- Latest flows table: `GET /api/flow/latest`

**Features:**
- Auto-refresh every 30 seconds
- Loading skeletons
- Empty state handling
- Time window filter (1d, 1w)

### Ticker View (`/ticker`)
**Data Sources:**
- Flow direction summary: `GET /api/flow/summary`
- Position building signals: `GET /api/flow/building`
- Building flows table: `GET /api/flow/building`

**Features:**
- Auto-refresh every 30 seconds
- Premium threshold filter
- Intelligent signal detection
- Empty state handling

## Testing

Open browser DevTools → Network tab and look for:

```
GET http://localhost:8080/api/flow/latest?symbol=QQQ&limit=50
GET http://localhost:8080/api/flow/summary?symbol=QQQ&windowHours=24
GET http://localhost:8080/api/flow/building?symbol=QQQ&minPremium=50000&lookbackMinutes=1440
GET http://localhost:8080/api/flow/tickers
```

All should return 200 OK with JSON data.

## Empty States

If you see "No flow data available":
1. Backend might not be running
2. Database might be empty - run `test-data.sh`
3. Selected ticker has no data - try "QQQ" or "SPY"

## Mock Data

The original mock data is still available in `src/lib/mockData.ts` but is no longer used. You can remove it or keep it for reference.

The formatting functions are still used:
- `formatPremium(number)` - Currency formatting
- `formatTime(string)` - Time formatting
- `formatDate(string)` - Date formatting

## Troubleshooting

### CORS Errors
Backend has CORS enabled for all origins. If you see CORS errors:
- Verify backend is running
- Check backend logs for startup errors
- Ensure you're using correct port (8080)

### Connection Refused
```bash
# Check if backend is running
curl http://localhost:8080/api/flow/tickers

# If not, start backend
cd ~/natural-flow
mvn spring-boot:run
```

### Old Data Showing
- Clear browser cache
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

## Deployment

When deploying to production:

1. Deploy backend first (Railway, Heroku, etc.)
2. Get backend URL (e.g., `https://natural-flow.railway.app`)
3. Update `.env.local`:
   ```bash
   VITE_API_URL=https://natural-flow.railway.app/api/flow
   ```
4. Deploy frontend via Lovable or Vercel

## Next Steps

### 1. Add Ticker Dropdown
The `/api/flow/tickers` endpoint returns available tickers. You can populate a dropdown:

```typescript
const { data: tickers } = useQuery({
  queryKey: ["tickers"],
  queryFn: getTickers,
});
```

### 2. Add Charts
Use `recharts` (already installed) to visualize:
- Premium over time
- Call/put ratio
- Strike distribution

### 3. Real-time Updates
Switch from 30s polling to WebSocket for live updates.

### 4. Export Data
Add CSV/Excel export functionality using summary data.

## Files Reference

### API Integration
- `src/lib/api.ts` - All API functions
- `.env.local` - Configuration

### Updated Pages
- `src/pages/Dashboard.tsx:21-32` - React Query hooks
- `src/pages/TickerView.tsx:22-33` - React Query hooks

### Utilities (Unchanged)
- `src/lib/mockData.ts` - Formatting functions
- `src/components/FilterBar.tsx` - Filter UI
- `src/components/SummaryCard.tsx` - Summary cards

## Support

For backend issues, see:
- `~/INTEGRATION_GUIDE.md` - Complete API documentation
- `~/natural-flow/README.md` - Backend-specific docs

For frontend issues:
- Check browser console for errors
- Check Network tab for failed API calls
- Verify `.env.local` has correct API URL
