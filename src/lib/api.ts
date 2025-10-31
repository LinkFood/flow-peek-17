// Natural Flow API Client
// Connects to the Spring Boot backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/flow';

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
  const response = await fetch(`${API_BASE_URL}/latest?symbol=${symbol}&limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch latest flow: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get call/put premium summary for a ticker
 * @param symbol - Ticker symbol
 * @param windowHours - Time window in hours (default: 24)
 */
export async function getSummary(symbol: string, windowHours: number = 24): Promise<SummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/summary?symbol=${symbol}&windowHours=${windowHours}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch summary: ${response.statusText}`);
  }
  return response.json();
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
  const response = await fetch(
    `${API_BASE_URL}/building?symbol=${symbol}&minPremium=${minPremium}&lookbackMinutes=${lookbackMinutes}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch building flow: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get list of available tickers (seen in last 24h)
 */
export async function getTickers(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/tickers`);
  if (!response.ok) {
    throw new Error(`Failed to fetch tickers: ${response.statusText}`);
  }
  return response.json();
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
  const response = await fetch(
    `${API_BASE_URL}/insights?symbol=${symbol}&windowHours=${windowHours}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch insights: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get AI-generated market-wide insights
 */
export async function getMarketInsights(): Promise<{
  analysis: string;
  timestamp: number;
}> {
  const response = await fetch(`${API_BASE_URL}/market-insights`);
  if (!response.ok) {
    throw new Error(`Failed to fetch market insights: ${response.statusText}`);
  }
  return response.json();
}
