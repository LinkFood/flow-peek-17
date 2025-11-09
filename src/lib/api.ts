// Natural Flow API Client
// Connects to the Spring Boot backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://web-production-43dc4.up.railway.app/api/flow';

export interface OptionFlowResponse {
  tsUtc: string;
  optionSymbol: string;
  side: "CALL" | "PUT";
  premium: number;
  expiry: string;
  strike: number;
  size: number;
  action?: string;
}

export interface LatestFlowResponse {
  symbol: string;
  count: number;
  rows: OptionFlowResponse[];
}

export interface SummaryResponse {
  symbol: string;
  windowHours: number;
  totalCallPremium: number;
  totalPutPremium: number;
  netPremium: number;
  count: number;
}

export interface BuildingFlowResponse {
  id: number;
  tsUtc: string;
  underlying: string;
  optionSymbol: string;
  side: "CALL" | "PUT";
  action?: string;
  premium: number;
  strike: number;
  expiry: string;
  size: number;
}

/**
 * Get latest flow events for a ticker
 * @param symbol - Ticker symbol (e.g., "SPY", "QQQ")
 * @param limit - Number of events to return (default: 50)
 */
export async function getLatestFlow(symbol: string, limit: number = 50): Promise<LatestFlowResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/latest?symbol=${symbol}&limit=${limit}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to fetch latest flow: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Network error fetching latest flow:', error);
    throw error;
  }
}

/**
 * Get call/put premium summary for a ticker
 * @param symbol - Ticker symbol
 * @param windowHours - Time window in hours (default: 24)
 */
export async function getSummary(symbol: string, windowHours: number = 24): Promise<SummaryResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/summary?symbol=${symbol}&windowHours=${windowHours}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to fetch summary: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Network error fetching summary:', error);
    throw error;
  }
}

/**
 * Get flow events indicating position building
 * This is the core "Natural Flow" feature
 * @param symbol - Ticker symbol
 * @param minPremium - Minimum premium threshold (default: 50000)
 * @param lookbackMinutes - Lookback window in minutes (default: 120)
 */
export async function getBuildingFlow(
  symbol: string,
  minPremium: number = 50000,
  lookbackMinutes: number = 120
): Promise<BuildingFlowResponse[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/building?symbol=${symbol}&minPremium=${minPremium}&lookbackMinutes=${lookbackMinutes}`
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to fetch building flow: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Network error fetching building flow:', error);
    throw error;
  }
}

/**
 * Get list of available tickers (seen in last 24h)
 */
export async function getTickers(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/tickers`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to fetch tickers: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Network error fetching tickers:', error);
    throw error;
  }
}

/**
 * Ingest raw flow data from Polygon or other provider
 * @param data - Raw JSON data from provider
 */
export async function ingestFlow(data: any): Promise<{ success: boolean; id?: number; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Convert backend response to frontend OptionFlow format
 */
export function convertToOptionFlow(apiFlow: OptionFlowResponse, id: string, underlying: string) {
  return {
    id,
    ts_utc: apiFlow.tsUtc,
    underlying,
    option_symbol: apiFlow.optionSymbol,
    side: apiFlow.side,
    action: apiFlow.action || "BUY",
    strike: apiFlow.strike,
    expiry: apiFlow.expiry,
    premium: apiFlow.premium,
    size: apiFlow.size,
  };
}

/**
 * Get AI-generated insights for a ticker
 * @param symbol - Ticker symbol
 * @param windowHours - Time window in hours (default: 24)
 */
export async function getInsights(symbol: string, windowHours: number = 24): Promise<{
  symbol: string;
  windowHours: number;
  analysis: string;
  timestamp: number;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/insights?symbol=${symbol}&windowHours=${windowHours}`
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to fetch insights: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Network error fetching insights:', error);
    throw error;
  }
}

/**
 * Get AI-generated market-wide insights
 */
export async function getMarketInsights(): Promise<{
  analysis: string;
  timestamp: number;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/market-insights`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to fetch market insights: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Network error fetching market insights:', error);
    throw error;
  }
}

// ===========================
// Market Pulse API (MAG7 Focus)
// ===========================

const PULSE_API_URL = import.meta.env.VITE_API_URL?.replace('/api/flow', '/api/pulse') || 'https://web-production-43dc4.up.railway.app/api/pulse';

export interface HeatmapData {
  [ticker: string]: {
    callPremium: number;
    putPremium: number;
    netFlow: number;
    tradeCount: number;
    sentiment: 'VERY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'VERY_BEARISH';
  };
}

export interface SmartMoneyTrade {
  timestamp: number;
  ticker: string;
  side: 'CALL' | 'PUT';
  premium: number;
  strike: number;
  expiry: string | null;
  size: number;
  optionSymbol: string;
}

export interface TimelineDataPoint {
  timestamp: number;
  callPremium: number;
  putPremium: number;
  netFlow: number;
  callCount: number;
  putCount: number;
}

export interface TimelineResponse {
  symbol: string;
  windowHours: number;
  bucketMinutes: number;
  dataPoints: TimelineDataPoint[];
}

export interface UnusualActivity {
  ticker: string;
  recentCallPremium: number;
  recentPutPremium: number;
  avgCallPremium: number;
  avgPutPremium: number;
  unusualCalls: boolean;
  unusualPuts: boolean;
  callMultiple?: number;
  putMultiple?: number;
}

export interface Mag7Summary {
  totalCallPremium: number;
  totalPutPremium: number;
  netPremium: number;
  totalTrades: number;
  bullishStocks: number;
  bearishStocks: number;
  neutralStocks: number;
  overallSentiment: 'BULLISH' | 'BEARISH';
  timestamp: number;
}

export interface StrikeConcentration {
  strike: number;
  expiry: string;
  side: 'CALL' | 'PUT';
  dte: number;
  hitCount: number;
  totalPremium: number;
  totalSize: number;
  flowGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
}

export interface StrikeConcentrationResponse {
  symbol: string;
  lookbackHours: number;
  strikes: StrikeConcentration[];
  count: number;
}

/**
 * Get MAG7 heatmap showing call/put sentiment
 */
export async function getMag7Heatmap(windowHours: number = 24): Promise<HeatmapData> {
  try {
    const response = await fetch(`${PULSE_API_URL}/heatmap?windowHours=${windowHours}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch heatmap: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching heatmap:', error);
    throw error;
  }
}

/**
 * Get smart money trades (>$100K premium)
 */
export async function getSmartMoneyTrades(limit: number = 50): Promise<{
  threshold: number;
  trades: SmartMoneyTrade[];
  count: number;
}> {
  try {
    const response = await fetch(`${PULSE_API_URL}/smart-money?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch smart money trades: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching smart money:', error);
    throw error;
  }
}

/**
 * Get flow timeline for a ticker (for charting)
 * @param cumulative - If true, returns running totals (for river lines). Default: true
 */
export async function getFlowTimeline(
  symbol: string,
  windowHours: number = 24,
  bucketMinutes: number = 60,
  cumulative: boolean = true
): Promise<TimelineResponse> {
  try {
    const response = await fetch(
      `${PULSE_API_URL}/timeline?symbol=${symbol}&windowHours=${windowHours}&bucketMinutes=${bucketMinutes}&cumulative=${cumulative}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch timeline: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching timeline:', error);
    throw error;
  }
}

/**
 * Get flow timeline for multiple tickers at once (efficient)
 * Returns all 9 tickers' data in one API call
 */
export async function getMultiTickerTimeline(
  symbols: string[],
  windowHours: number = 24,
  bucketMinutes: number = 15,
  cumulative: boolean = true
): Promise<{ [symbol: string]: TimelineResponse }> {
  try {
    const response = await fetch(
      `${PULSE_API_URL}/timeline-multi?symbols=${symbols.join(',')}&windowHours=${windowHours}&bucketMinutes=${bucketMinutes}&cumulative=${cumulative}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch multi-ticker timeline: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching multi-ticker timeline:', error);
    throw error;
  }
}

/**
 * Get historical flow timeline for a specific date
 * Used for date picker / time travel functionality
 */
export async function getTimelineByDate(
  symbol: string,
  date: string, // Format: YYYY-MM-DD
  startTime: string = '09:30',
  endTime: string = '16:00',
  bucketMinutes: number = 15
): Promise<{
  symbol: string;
  date: string;
  startTime: string;
  endTime: string;
  flows: any[];
  prices: any[];
  flowCount: number;
  priceCount: number;
}> {
  try {
    const response = await fetch(
      `${PULSE_API_URL}/timeline-by-date?symbol=${symbol}&date=${date}&startTime=${startTime}&endTime=${endTime}&bucketMinutes=${bucketMinutes}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch timeline by date: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching timeline by date:', error);
    throw error;
  }
}

/**
 * Get MAG7 overall summary
 */
export async function getMag7Summary(): Promise<Mag7Summary> {
  try {
    const response = await fetch(`${PULSE_API_URL}/mag7-summary`);
    if (!response.ok) {
      throw new Error(`Failed to fetch MAG7 summary: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching MAG7 summary:', error);
    throw error;
  }
}

/**
 * Get unusual activity alerts (3x+ normal volume)
 */
export async function getUnusualActivity(limit: number = 10): Promise<UnusualActivity[]> {
  try {
    const response = await fetch(`${PULSE_API_URL}/unusual-activity?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch unusual activity: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching unusual activity:', error);
    throw error;
  }
}

/**
 * Get strike concentration data (where institutional money is concentrating)
 */
export async function getStrikeConcentration(
  symbol: string,
  lookbackHours: number = 48,
  minHits: number = 2
): Promise<StrikeConcentrationResponse> {
  try {
    const response = await fetch(
      `${PULSE_API_URL}/strikes?symbol=${symbol}&lookbackHours=${lookbackHours}&minHits=${minHits}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch strike concentration: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching strike concentration:', error);
    throw error;
  }
}

/**
 * Get aggregated sentiment tide data for multiple stocks
 * Combines timeline data from all stocks into single tide view
 */
export async function getAggregatedSentimentTide(
  symbols: string[],
  windowHours: number = 24,
  bucketMinutes: number = 60
): Promise<{
  timestamp: number;
  callPremium: number;
  putPremium: number;
  netFlow: number;
}[]> {
  try {
    // Fetch timeline for each symbol in parallel
    const timelinePromises = symbols.map(symbol =>
      getFlowTimeline(symbol, windowHours, bucketMinutes)
    );

    const timelines = await Promise.all(timelinePromises);

    // Aggregate by timestamp
    const aggregatedMap = new Map<number, {
      callPremium: number;
      putPremium: number;
    }>();

    timelines.forEach(timeline => {
      timeline.dataPoints.forEach(point => {
        const existing = aggregatedMap.get(point.timestamp) || {
          callPremium: 0,
          putPremium: 0
        };

        aggregatedMap.set(point.timestamp, {
          callPremium: existing.callPremium + point.callPremium,
          putPremium: existing.putPremium + point.putPremium
        });
      });
    });

    // Convert to array and calculate net flow
    return Array.from(aggregatedMap.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        callPremium: data.callPremium,
        putPremium: data.putPremium,
        netFlow: data.callPremium - data.putPremium
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

  } catch (error) {
    console.error('Error fetching aggregated sentiment tide:', error);
    return [];
  }
}

// ===========================
// Data Loading & Replay API
// ===========================

const REPLAY_API_URL = import.meta.env.VITE_API_URL?.replace('/api/flow', '/api/replay') || 'https://web-production-43dc4.up.railway.app/api/replay';

/**
 * Load historical stock prices for a specific date
 * Use this to backload price data for testing
 */
export async function fetchHistoricalPrices(date: string): Promise<{
  success: boolean;
  date: string;
  results: { [ticker: string]: number };
}> {
  try {
    const response = await fetch(`${REPLAY_API_URL}/fetch-prices?date=${date}`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch historical prices: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    throw error;
  }
}

/**
 * Load sample historical data for testing
 * Generates synthetic flow data for N days back
 */
export async function loadSampleData(days: number = 7, clearFirst: boolean = false): Promise<{
  success: boolean;
  daysGenerated: number;
  totalTrades: number;
}> {
  try {
    const response = await fetch(
      `${PULSE_API_URL}/load-historical-data?days=${days}&clearFirst=${clearFirst}`,
      { method: 'POST' }
    );
    if (!response.ok) {
      throw new Error(`Failed to load sample data: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error loading sample data:', error);
    throw error;
  }
}

/**
 * Constants for MAG7 + SPY + QQQ
 */
export const TRACKED_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'SPY', 'QQQ'] as const;
export type TrackedTicker = typeof TRACKED_TICKERS[number];

// ===========================
// FAST Timeline API (1-minute aggregations)
// ===========================

const TIMELINE_API_URL = import.meta.env.VITE_API_URL?.replace('/api/flow', '/api/timeline') || 'https://web-production-43dc4.up.railway.app/api/timeline';

export interface FastTimelineDataPoint {
  timestamp: string; // ISO string
  callPremium: number;
  putPremium: number;
  callCount: number;
  putCount: number;
  netFlow: number;
  cumulativeCall: number;
  cumulativePut: number;
  cumulativeNet: number;
}

export interface FastTimelineResponse {
  ticker: string;
  date: string;
  startTime: string;
  endTime: string;
  dataPoints: FastTimelineDataPoint[];
  totalBuckets: number;
  finalCallPremium: number;
  finalPutPremium: number;
  finalNetFlow: number;
}

export interface FastMultiTickerResponse {
  date: string;
  startTime: string;
  endTime: string;
  tickers: {
    [ticker: string]: {
      dataPoints: FastTimelineDataPoint[];
      totalBuckets: number;
      finalCallPremium: number;
      finalPutPremium: number;
      finalNetFlow: number;
    };
  };
  count: number;
}

/**
 * Get fast chart data for a single ticker (uses 1-minute aggregations)
 * Target: <200ms (vs 8+ seconds for old API)
 */
export async function getFastChartData(
  ticker: string,
  date: string, // YYYY-MM-DD
  startTime: string = '09:30',
  endTime: string = '16:00'
): Promise<FastTimelineResponse> {
  try {
    const response = await fetch(
      `${TIMELINE_API_URL}/chart?ticker=${ticker}&date=${date}&start=${startTime}&end=${endTime}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch fast chart data: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching fast chart data:', error);
    throw error;
  }
}

/**
 * Get fast chart data for multiple tickers at once (uses 1-minute aggregations)
 * Target: <2 seconds for all 9 tickers (vs 90+ seconds for old API)
 */
export async function getFastMultiTickerChart(
  tickers: string[],
  date: string, // YYYY-MM-DD
  startTime: string = '09:30',
  endTime: string = '16:00'
): Promise<FastMultiTickerResponse> {
  try {
    const response = await fetch(
      `${TIMELINE_API_URL}/multi-ticker?tickers=${tickers.join(',')}&date=${date}&start=${startTime}&end=${endTime}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch fast multi-ticker chart: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching fast multi-ticker chart:', error);
    throw error;
  }
}

/**
 * Get recent timeline data (for real-time updates)
 * Target: <100ms
 */
export async function getRecentTimeline(
  ticker: string,
  minutes: number = 15
): Promise<{
  ticker: string;
  minutes: number;
  dataPoints: FastTimelineDataPoint[];
  count: number;
}> {
  try {
    const response = await fetch(
      `${TIMELINE_API_URL}/recent?ticker=${ticker}&minutes=${minutes}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch recent timeline: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching recent timeline:', error);
    throw error;
  }
}

/**
 * Get current minute snapshot for all tickers (for AI bot)
 * Target: <50ms
 */
export async function getCurrentMinuteSnapshot(): Promise<{
  bucketTime: string;
  tickers: {
    [ticker: string]: {
      callPremium: number;
      putPremium: number;
      callCount: number;
      putCount: number;
      netFlow: number;
      lastUpdated: string;
    };
  };
  count: number;
}> {
  try {
    const response = await fetch(`${TIMELINE_API_URL}/current-minute`);
    if (!response.ok) {
      throw new Error(`Failed to fetch current minute snapshot: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching current minute snapshot:', error);
    throw error;
  }
}

/**
 * Check timeline aggregation system health
 */
export async function getTimelineHealth(): Promise<{
  status: string;
  totalBuckets: number;
  last24Hours: number;
  activeTickers: string[];
  activeTickerCount: number;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${TIMELINE_API_URL}/health`);
    if (!response.ok) {
      throw new Error(`Failed to fetch timeline health: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching timeline health:', error);
    throw error;
  }
}

/**
 * Backfill aggregations for historical data (run once after deployment)
 */
export async function backfillAggregations(days: number = 7): Promise<{
  success: boolean;
  tradesProcessed: number;
  daysBackfilled: number;
  durationMs: number;
  tradesPerSecond: number;
  message: string;
}> {
  try {
    const response = await fetch(`${TIMELINE_API_URL}/backfill?days=${days}`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error(`Failed to backfill aggregations: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error backfilling aggregations:', error);
    throw error;
  }
}
