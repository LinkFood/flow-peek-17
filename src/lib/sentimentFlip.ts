// Sentiment Flip Detection
// Identifies when market sentiment crosses bullish/bearish threshold

export interface SentimentFlip {
  timestamp: number;
  fromSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  toSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  netFlowDelta: number;
  significance: 'MINOR' | 'MODERATE' | 'MAJOR';
}

export interface TideDataPoint {
  timestamp: number;
  callPremium: number;
  putPremium: number;
  netFlow: number;
}

/**
 * Determine sentiment based on net flow
 */
function getSentiment(netFlow: number): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const threshold = 500000; // $500K threshold for neutral zone

  if (netFlow > threshold) return 'BULLISH';
  if (netFlow < -threshold) return 'BEARISH';
  return 'NEUTRAL';
}

/**
 * Calculate flip significance based on magnitude of change
 */
function calculateSignificance(
  fromNetFlow: number,
  toNetFlow: number
): 'MINOR' | 'MODERATE' | 'MAJOR' {
  const delta = Math.abs(toNetFlow - fromNetFlow);

  // Major flip: >$5M change
  if (delta > 5000000) return 'MAJOR';

  // Moderate flip: >$2M change
  if (delta > 2000000) return 'MODERATE';

  // Minor flip: everything else
  return 'MINOR';
}

/**
 * Detect sentiment flips in time series data
 * Returns array of flip events sorted by timestamp
 */
export function detectSentimentFlips(
  data: TideDataPoint[],
  lookbackMinutes: number = 120
): SentimentFlip[] {
  if (!data || data.length < 2) return [];

  // Sort by timestamp
  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

  const flips: SentimentFlip[] = [];
  let currentSentiment = getSentiment(sortedData[0].netFlow);

  // Scan through data looking for sentiment changes
  for (let i = 1; i < sortedData.length; i++) {
    const prevPoint = sortedData[i - 1];
    const currPoint = sortedData[i];

    const newSentiment = getSentiment(currPoint.netFlow);

    // Detected a sentiment flip
    if (newSentiment !== currentSentiment && newSentiment !== 'NEUTRAL') {
      const flip: SentimentFlip = {
        timestamp: currPoint.timestamp,
        fromSentiment: currentSentiment,
        toSentiment: newSentiment,
        netFlowDelta: currPoint.netFlow - prevPoint.netFlow,
        significance: calculateSignificance(prevPoint.netFlow, currPoint.netFlow),
      };

      flips.push(flip);
      currentSentiment = newSentiment;
    }
  }

  // Filter to lookback window
  const now = Date.now();
  const cutoff = now - (lookbackMinutes * 60 * 1000);

  return flips.filter(flip => flip.timestamp >= cutoff);
}

/**
 * Get most recent flip event
 */
export function getLatestFlip(flips: SentimentFlip[]): SentimentFlip | null {
  if (!flips || flips.length === 0) return null;
  return flips[flips.length - 1];
}

/**
 * Format flip for display
 */
export function formatFlipMessage(flip: SentimentFlip): string {
  const timeAgo = getTimeAgo(flip.timestamp);
  const direction = flip.toSentiment === 'BULLISH' ? 'turned BULLISH' : 'turned BEARISH';
  const magnitude = flip.significance === 'MAJOR' ? 'STRONG' : flip.significance;

  return `Market ${direction} ${timeAgo} (${magnitude} flip, $${(Math.abs(flip.netFlowDelta) / 1000000).toFixed(1)}M swing)`;
}

/**
 * Helper: Format timestamp to relative time
 */
function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Check if there's a flip in the last N minutes
 */
export function hasRecentFlip(flips: SentimentFlip[], minutes: number = 30): boolean {
  const latest = getLatestFlip(flips);
  if (!latest) return false;

  const cutoff = Date.now() - (minutes * 60 * 1000);
  return latest.timestamp >= cutoff;
}
