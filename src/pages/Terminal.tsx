import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getMag7Heatmap, getMag7Summary, getSmartMoneyTrades, getAggregatedSentimentTide } from "@/lib/api";
import { SentimentTide } from "@/components/SentimentTide";
import { FlowRiver } from "@/components/FlowRiver";
import { detectSentimentFlips, getLatestFlip, formatFlipMessage, hasRecentFlip } from "@/lib/sentimentFlip";
import { generateMarketNarrative } from "@/lib/narrativeEngine";

// MAG7 stocks (backend currently only supports these 7)
// TODO: Add SPY and QQQ when backend data is available
const TRACKED_STOCKS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"];

const Terminal = () => {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const API_BASE = "https://web-production-43dc4.up.railway.app/api";

  const { data: systemHealth } = useQuery({
    queryKey: ["system-health-terminal"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/system/health`);
      return res.json();
    },
    refetchInterval: 10000,
  });

  const generateDemoData = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/pulse/load-historical-data?daysBack=1&clearFirst=false`, { method: "POST" });
      return res.json();
    },
  });

  // Fetch MAG7 heatmap data
  const { data: heatmapData } = useQuery({
    queryKey: ["heatmap-terminal"],
    queryFn: () => getMag7Heatmap(24),
    refetchInterval: 10000,
  });

  // Fetch MAG7 summary
  const { data: summaryData } = useQuery({
    queryKey: ["summary-terminal"],
    queryFn: getMag7Summary,
    refetchInterval: 10000,
  });

  // Fetch smart money trades
  const { data: smartMoneyData } = useQuery({
    queryKey: ["smart-money-terminal"],
    queryFn: () => getSmartMoneyTrades(50),
    refetchInterval: 10000,
  });

  // Fetch aggregated sentiment tide data
  const { data: tideData } = useQuery({
    queryKey: ["sentiment-tide"],
    queryFn: () => getAggregatedSentimentTide(TRACKED_STOCKS, 24, 60),
    refetchInterval: 10000,
  });

  // Detect sentiment flips from tide data
  const sentimentFlips = useMemo(() => {
    if (!tideData || tideData.length === 0) return [];
    return detectSentimentFlips(tideData, 120); // Last 2 hours
  }, [tideData]);

  const latestFlip = useMemo(() => getLatestFlip(sentimentFlips), [sentimentFlips]);
  const recentFlipDetected = useMemo(() => hasRecentFlip(sentimentFlips, 30), [sentimentFlips]);

  // Generate market narrative
  const narrative = useMemo(() => {
    return generateMarketNarrative(
      summaryData,
      heatmapData,
      smartMoneyData?.trades,
      latestFlip
    );
  }, [summaryData, heatmapData, smartMoneyData, latestFlip]);

  // Update timestamp
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    return seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground">
      {/* Live Status Bar */}
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold text-red-500">LIVE</span>
          </div>
          <div className="text-sm text-muted-foreground">|</div>
          <span className="text-sm font-semibold">NATURAL FLOW TERMINAL</span>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="text-muted-foreground">
            Last Update: <span className="text-foreground">{getTimeSinceUpdate()}</span>
          </div>
          {summaryData && (
            <>
              <div className="text-muted-foreground">|</div>
              <div className="text-muted-foreground">
                Total Trades: <span className="text-foreground font-mono">{summaryData.totalTrades}</span>
              </div>
              <div className="text-muted-foreground">|</div>
              <div className={summaryData.netPremium > 0 ? "text-green-400" : "text-red-400"}>
                Net Flow: <span className="font-mono">${(summaryData.netPremium / 1000000).toFixed(1)}M</span>
              </div>
            </>
          )}
        </div>
      </div>

      {systemHealth && systemHealth.database?.totalTrades === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-300 px-6 py-3">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="text-sm">
              No trades in the backend yet. You can generate demo data to see the UI in action.
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => generateDemoData.mutate()}
                className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm"
              >
                Generate 1 Day Demo Data
              </button>
              <a href="/admin" className="text-sm underline">
                Open Admin Debug
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Terminal Layout */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Stock Selector */}
        <div className="w-48 bg-card border-r border-border p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Tracked Stocks
          </div>

          <div className="space-y-1">
            {TRACKED_STOCKS.map((ticker) => {
              const data = heatmapData?.[ticker];
              const isSelected = selectedStock === ticker;

              return (
                <button
                  key={ticker}
                  onClick={() => setSelectedStock(isSelected ? null : ticker)}
                  className={`w-full text-left px-3 py-2 rounded text-sm font-mono transition-all ${
                    isSelected
                      ? "bg-primary/20 text-primary border border-primary/50"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{ticker}</span>
                    {data && (
                      <span className={`text-xs ${data.netFlow > 0 ? "text-green-400" : "text-red-400"}`}>
                        {data.netFlow > 0 ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                  {data && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {data.tradeCount} trades
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Sentiment Alerts
            </div>

            {latestFlip && recentFlipDetected ? (
              <div className={`text-xs p-2 rounded border ${
                latestFlip.toSentiment === 'BULLISH'
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <div className="font-semibold mb-1 uppercase">
                  {latestFlip.significance} FLIP DETECTED
                </div>
                <div className="text-xs leading-relaxed">
                  {formatFlipMessage(latestFlip)}
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {sentimentFlips.length > 0
                  ? `Last flip: ${formatFlipMessage(latestFlip!)}`
                  : 'No sentiment flips detected'
                }
              </div>
            )}

            {sentimentFlips.length > 1 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {sentimentFlips.length} flips in last 2h
              </div>
            )}
          </div>
        </div>

        {/* Center - Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Market Sentiment Tide */}
          <div className="h-80 bg-card border-b border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Market Sentiment Tide
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Aggregated call/put flow across MAG7 stocks
                </div>
              </div>
              {summaryData && (
                <div className="text-right">
                  <div className={`text-sm font-bold ${summaryData.overallSentiment === "BULLISH" ? "text-green-400" : "text-red-400"}`}>
                    {summaryData.overallSentiment}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {summaryData.bullishStocks}B • {summaryData.neutralStocks}N • {summaryData.bearishStocks}B
                  </div>
                </div>
              )}
            </div>

            <SentimentTide data={tideData || []} height={260} />
          </div>

          {/* Flow River + Table Hybrid */}
          <div className="flex-1 p-6 space-y-4">
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Institutional Flow River
            </div>

            {/* Flow River - 60% space */}
            <FlowRiver
              trades={smartMoneyData?.trades.map(trade => ({
                timestamp: trade.timestamp,
                ticker: trade.ticker,
                side: trade.side,
                premium: trade.premium,
              })) || []}
              height={256}
            />

            {/* Flow Table - 40% space */}
            <div className="bg-card border border-border rounded">
              <div className="p-4 border-b border-border">
                <div className="text-sm font-semibold">Recent Institutional Trades ($100K+)</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr className="text-muted-foreground text-xs uppercase">
                      <th className="text-left p-3 font-medium">Time</th>
                      <th className="text-left p-3 font-medium">Ticker</th>
                      <th className="text-left p-3 font-medium">Side</th>
                      <th className="text-right p-3 font-medium">Premium</th>
                      <th className="text-right p-3 font-medium">Strike</th>
                      <th className="text-left p-3 font-medium">Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smartMoneyData && smartMoneyData.trades.length > 0 ? (
                      smartMoneyData.trades.slice(0, 10).map((trade, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-secondary/30">
                          <td className="p-3 font-mono text-xs">
                            {new Date(trade.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td className="p-3 font-bold">{trade.ticker}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              trade.side === "CALL"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}>
                              {trade.side}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-primary font-semibold">
                            ${(trade.premium / 1000).toFixed(0)}K
                          </td>
                          <td className="p-3 text-right font-mono">${trade.strike}</td>
                          <td className="p-3 font-mono text-xs">{trade.expiry || 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No smart money trades detected yet. Markets may be closed.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - What's Happening */}
        <div className="w-80 bg-card border-l border-border p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            What's Happening
          </div>

          <div className="bg-primary/10 border border-primary/30 rounded p-4 mb-4">
            <div className="text-sm leading-relaxed text-primary font-semibold mb-2 uppercase tracking-wide">
              {narrative.headline}
            </div>
            <div className="text-xs leading-relaxed mt-3">
              {narrative.summary}
            </div>
          </div>

          {/* Key Points */}
          {narrative.keyPoints.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Key Insights
              </div>
              {narrative.keyPoints.map((point, idx) => (
                <div key={idx} className="text-xs leading-relaxed flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          )}

          {selectedStock && heatmapData?.[selectedStock] && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {selectedStock} Analysis
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Net Flow (24h)</div>
                  <div className={`text-2xl font-bold font-mono ${
                    heatmapData[selectedStock].netFlow > 0 ? "text-green-400" : "text-red-400"
                  }`}>
                    ${(heatmapData[selectedStock].netFlow / 1000000).toFixed(2)}M
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Sentiment</div>
                  <div className="text-lg font-semibold">
                    {heatmapData[selectedStock].sentiment.replace('_', ' ')}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Trade Count</div>
                  <div className="text-lg font-semibold font-mono">
                    {heatmapData[selectedStock].tradeCount}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Terminal;
