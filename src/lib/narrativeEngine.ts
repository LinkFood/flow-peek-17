// Rule-Based Narrative Engine
// Generates natural language market summaries from flow data

import type { SentimentFlip } from './sentimentFlip';

interface MarketData {
  netPremium: number;
  totalTrades: number;
  overallSentiment: 'BULLISH' | 'BEARISH';
  bullishStocks: number;
  bearishStocks: number;
  neutralStocks: number;
}

interface HeatmapStock {
  netFlow: number;
  callPremium: number;
  putPremium: number;
  tradeCount: number;
  sentiment: string;
}

interface SmartMoneyTrade {
  ticker: string;
  side: 'CALL' | 'PUT';
  premium: number;
  timestamp: number;
}

export interface MarketNarrative {
  headline: string;
  summary: string;
  keyPoints: string[];
  timestamp: number;
}

/**
 * Generate rule-based market narrative from flow data
 */
export function generateMarketNarrative(
  summaryData: MarketData | undefined,
  heatmapData: Record<string, HeatmapStock> | undefined,
  smartMoneyTrades: SmartMoneyTrade[] | undefined,
  latestFlip: SentimentFlip | null
): MarketNarrative {
  const now = Date.now();

  if (!summaryData || !heatmapData) {
    return {
      headline: 'Waiting for market data',
      summary: 'Loading institutional flow data from backend...',
      keyPoints: ['Connect to backend', 'Awaiting real-time flow'],
      timestamp: now,
    };
  }

  // Find most active stock
  const mostActive = Object.entries(heatmapData)
    .sort((a, b) => b[1].tradeCount - a[1].tradeCount)[0];

  // Find largest flow
  const largestFlow = Object.entries(heatmapData)
    .sort((a, b) => Math.abs(b[1].netFlow) - Math.abs(a[1].netFlow))[0];

  // Recent large trades
  const recentLargeTrades = smartMoneyTrades
    ?.filter(t => t.premium > 200000)
    .slice(0, 3) || [];

  // Generate headline based on sentiment
  const headline = generateHeadline(summaryData, latestFlip, largestFlow);

  // Generate summary paragraph
  const summary = generateSummary(
    summaryData,
    mostActive,
    largestFlow,
    latestFlip
  );

  // Generate key points
  const keyPoints = generateKeyPoints(
    summaryData,
    heatmapData,
    recentLargeTrades,
    latestFlip
  );

  return {
    headline,
    summary,
    keyPoints,
    timestamp: now,
  };
}

/**
 * Generate attention-grabbing headline
 */
function generateHeadline(
  data: MarketData,
  flip: SentimentFlip | null,
  largestFlow: [string, HeatmapStock] | undefined
): string {
  // Sentiment flip takes priority
  if (flip) {
    const direction = flip.toSentiment === 'BULLISH' ? 'BULLISH' : 'BEARISH';
    const magnitude = flip.significance === 'MAJOR' ? 'MAJOR' : flip.significance;
    return `${magnitude} FLIP: Market turns ${direction}`;
  }

  // Strong sentiment
  if (Math.abs(data.netPremium) > 10000000) {
    const direction = data.netPremium > 0 ? 'BULLISH' : 'BEARISH';
    const intensity = Math.abs(data.netPremium) > 20000000 ? 'Heavily' : 'Strongly';
    return `${intensity} ${direction}: $${(Math.abs(data.netPremium) / 1000000).toFixed(0)}M net flow`;
  }

  // Focused activity on one stock
  if (largestFlow && Math.abs(largestFlow[1].netFlow) > 5000000) {
    const direction = largestFlow[1].netFlow > 0 ? 'CALL' : 'PUT';
    return `${largestFlow[0]} sees heavy ${direction} flow`;
  }

  // Mixed sentiment
  if (data.bullishStocks > 0 && data.bearishStocks > 0) {
    return `Mixed sentiment: ${data.bullishStocks} bullish, ${data.bearishStocks} bearish`;
  }

  // Default
  return `${data.overallSentiment} sentiment with ${data.totalTrades} institutional trades`;
}

/**
 * Generate summary paragraph
 */
function generateSummary(
  data: MarketData,
  mostActive: [string, HeatmapStock] | undefined,
  largestFlow: [string, HeatmapStock] | undefined,
  flip: SentimentFlip | null
): string {
  const parts: string[] = [];

  // Opening statement
  const netFlowMM = (data.netPremium / 1000000).toFixed(1);
  const direction = data.netPremium > 0 ? 'bullish' : 'bearish';
  parts.push(
    `Institutional flow is ${direction} with $${Math.abs(parseFloat(netFlowMM))}M net premium across ${data.totalTrades} trades.`
  );

  // Sentiment flip
  if (flip) {
    const timingWord = getTimingWord(flip.timestamp);
    parts.push(
      `Market ${flip.toSentiment.toLowerCase()} ${timingWord} after ${flip.significance.toLowerCase()} sentiment shift.`
    );
  }

  // Most active stock
  if (mostActive) {
    const [ticker, stockData] = mostActive;
    const stockDirection = stockData.netFlow > 0 ? 'calls' : 'puts';
    parts.push(
      `${ticker} leads activity with ${stockData.tradeCount} trades, favoring ${stockDirection}.`
    );
  }

  // Largest flow
  if (largestFlow && largestFlow[0] !== mostActive?.[0]) {
    const [ticker, stockData] = largestFlow;
    const flowMM = (Math.abs(stockData.netFlow) / 1000000).toFixed(1);
    parts.push(
      `${ticker} shows $${flowMM}M ${stockData.netFlow > 0 ? 'call' : 'put'} pressure.`
    );
  }

  return parts.join(' ');
}

/**
 * Generate bullet point key insights
 */
function generateKeyPoints(
  data: MarketData,
  heatmap: Record<string, HeatmapStock>,
  largeTrades: SmartMoneyTrade[],
  flip: SentimentFlip | null
): string[] {
  const points: string[] = [];

  // Sentiment distribution
  const totalStocks = data.bullishStocks + data.bearishStocks + data.neutralStocks;
  if (totalStocks > 0) {
    const bullishPct = Math.round((data.bullishStocks / totalStocks) * 100);
    points.push(`${bullishPct}% of tracked stocks showing bullish flow`);
  }

  // Top movers
  const topBullish = Object.entries(heatmap)
    .filter(([_, d]) => d.netFlow > 0)
    .sort((a, b) => b[1].netFlow - a[1].netFlow)[0];

  const topBearish = Object.entries(heatmap)
    .filter(([_, d]) => d.netFlow < 0)
    .sort((a, b) => a[1].netFlow - b[1].netFlow)[0];

  if (topBullish) {
    points.push(
      `${topBullish[0]} most bullish: $${(topBullish[1].netFlow / 1000000).toFixed(1)}M calls`
    );
  }

  if (topBearish) {
    points.push(
      `${topBearish[0]} most bearish: $${(Math.abs(topBearish[1].netFlow) / 1000000).toFixed(1)}M puts`
    );
  }

  // Large recent trades
  if (largeTrades.length > 0) {
    const trade = largeTrades[0];
    const age = getTimingWord(trade.timestamp);
    points.push(
      `${trade.ticker} ${trade.side.toLowerCase()} sweep ${age}: $${(trade.premium / 1000).toFixed(0)}K`
    );
  }

  // Sentiment flip
  if (flip) {
    points.push(
      `Market flipped ${flip.toSentiment.toLowerCase()} ${getTimingWord(flip.timestamp)}`
    );
  }

  return points;
}

/**
 * Convert timestamp to relative timing word
 */
function getTimingWord(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);

  if (minutes < 2) return 'just now';
  if (minutes < 10) return `${minutes}m ago`;
  if (minutes < 60) return 'recently';
  if (minutes < 120) return 'an hour ago';
  return 'earlier today';
}

/**
 * AI-enhanced narrative (placeholder for GPT-4 integration)
 * Falls back to rule-based if AI unavailable
 */
export async function generateAINarrative(
  summaryData: MarketData | undefined,
  heatmapData: Record<string, HeatmapStock> | undefined,
  smartMoneyTrades: SmartMoneyTrade[] | undefined,
  latestFlip: SentimentFlip | null
): Promise<MarketNarrative> {
  // TODO: Integrate with backend AI insights endpoint
  // For now, use rule-based fallback
  return generateMarketNarrative(summaryData, heatmapData, smartMoneyTrades, latestFlip);
}
