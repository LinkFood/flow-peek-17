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
 */
export async function getFlowTimeline(
  symbol: string,
  windowHours: number = 24,
  bucketMinutes: number = 60
): Promise<TimelineResponse> {
  try {
    const response = await fetch(
      `${PULSE_API_URL}/timeline?symbol=${symbol}&windowHours=${windowHours}&bucketMinutes=${bucketMinutes}`
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
