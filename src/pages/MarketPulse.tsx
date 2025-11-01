import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMag7Heatmap, getMag7Summary, getSmartMoneyTrades, getUnusualActivity } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Activity } from "lucide-react";
import { formatPremium, formatTime } from "@/lib/mockData";

const MAG7_STOCKS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"];

const sentimentColors = {
  VERY_BULLISH: "bg-green-600 hover:bg-green-700",
  BULLISH: "bg-green-500 hover:bg-green-600",
  NEUTRAL: "bg-gray-500 hover:bg-gray-600",
  BEARISH: "bg-red-500 hover:bg-red-600",
  VERY_BEARISH: "bg-red-600 hover:bg-red-700",
};

const sentimentIcons = {
  VERY_BULLISH: <TrendingUp className="w-8 h-8" />,
  BULLISH: <TrendingUp className="w-6 h-6" />,
  NEUTRAL: <Activity className="w-6 h-6" />,
  BEARISH: <TrendingDown className="w-6 h-6" />,
  VERY_BEARISH: <TrendingDown className="w-8 h-8" />,
};

const MarketPulse = () => {
  const [windowHours, setWindowHours] = useState(24);

  // Fetch heatmap data
  const { data: heatmapData, isLoading: loadingHeatmap } = useQuery({
    queryKey: ["mag7-heatmap", windowHours],
    queryFn: () => getMag7Heatmap(windowHours),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch MAG7 summary
  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ["mag7-summary"],
    queryFn: getMag7Summary,
    refetchInterval: 10000,
  });

  // Fetch smart money trades
  const { data: smartMoneyData, isLoading: loadingSmartMoney } = useQuery({
    queryKey: ["smart-money"],
    queryFn: () => getSmartMoneyTrades(20),
    refetchInterval: 10000,
  });

  // Fetch unusual activity
  const { data: unusualData, isLoading: loadingUnusual } = useQuery({
    queryKey: ["unusual-activity"],
    queryFn: () => getUnusualActivity(5),
    refetchInterval: 10000,
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen p-6 bg-background">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-foreground mb-1">MAG7 Market Pulse</h2>
        <p className="text-muted-foreground">
          Real-time institutional flow tracking for mega-cap tech stocks
        </p>
      </div>

      {/* MAG7 Overall Summary */}
      {loadingSummary ? (
        <Card className="mb-6">
          <CardContent className="p-6">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ) : summaryData ? (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Net Premium</div>
                <div
                  className={`text-2xl font-bold ${
                    summaryData.netPremium > 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {formatPremium(summaryData.netPremium)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Sentiment</div>
                <Badge
                  variant="outline"
                  className={`text-lg ${
                    summaryData.overallSentiment === "BULLISH" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {summaryData.overallSentiment}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Total Trades</div>
                <div className="text-2xl font-bold">{summaryData.totalTrades.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Stock Breakdown</div>
                <div className="text-sm">
                  <span className="text-green-500">{summaryData.bullishStocks}↑</span>
                  {" / "}
                  <span className="text-gray-500">{summaryData.neutralStocks}→</span>
                  {" / "}
                  <span className="text-red-500">{summaryData.bearishStocks}↓</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Heatmap Grid */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>MAG7 Sentiment Heatmap</CardTitle>
          <CardDescription>
            Live call/put premium flow (last {windowHours}h) - Click a stock for detailed timeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {loadingHeatmap
              ? MAG7_STOCKS.map((ticker) => (
                  <Skeleton key={ticker} className="h-32 w-full" />
                ))
              : heatmapData &&
                MAG7_STOCKS.map((ticker) => {
                  const data = heatmapData[ticker];
                  if (!data) return null;

                  return (
                    <button
                      key={ticker}
                      className={`${
                        sentimentColors[data.sentiment]
                      } rounded-lg p-4 text-white transition-all hover:scale-105 cursor-pointer`}
                      onClick={() => (window.location.href = `/ticker/${ticker}`)}
                    >
                      <div className="flex flex-col items-center">
                        <div className="text-2xl font-bold mb-2">{ticker}</div>
                        <div className="mb-2">{sentimentIcons[data.sentiment]}</div>
                        <div className="text-xs opacity-90">{formatPremium(data.netFlow)}</div>
                        <div className="text-xs opacity-75 mt-1">{data.tradeCount} trades</div>
                      </div>
                    </button>
                  );
                })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smart Money Trades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Smart Money Trades
            </CardTitle>
            <CardDescription>Institutional trades over $100K</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSmartMoney ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : smartMoneyData && smartMoneyData.trades.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {smartMoneyData.trades.map((trade, idx) => (
                  <div
                    key={idx}
                    className="border border-border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{trade.ticker}</span>
                        <Badge
                          variant="outline"
                          className={trade.side === "CALL" ? "call-badge" : "put-badge"}
                        >
                          {trade.side}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-500">
                          {formatPremium(trade.premium)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(new Date(trade.timestamp).toISOString())}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${trade.strike} • {trade.size} contracts
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No smart money trades detected yet. Markets may be closed.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unusual Activity Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Unusual Activity Alerts
            </CardTitle>
            <CardDescription>Flow 3x+ above historical average</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUnusual ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : unusualData && unusualData.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {unusualData.map((activity, idx) => (
                  <div
                    key={idx}
                    className="border border-yellow-500/30 bg-yellow-500/10 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-lg">{activity.ticker}</span>
                      <div className="flex gap-2">
                        {activity.unusualCalls && activity.callMultiple && (
                          <Badge variant="outline" className="text-green-500">
                            CALLS {activity.callMultiple.toFixed(1)}x
                          </Badge>
                        )}
                        {activity.unusualPuts && activity.putMultiple && (
                          <Badge variant="outline" className="text-red-500">
                            PUTS {activity.putMultiple.toFixed(1)}x
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {activity.unusualCalls && (
                        <div>
                          Calls: {formatPremium(activity.recentCallPremium)} vs avg{" "}
                          {formatPremium(activity.avgCallPremium)}
                        </div>
                      )}
                      {activity.unusualPuts && (
                        <div>
                          Puts: {formatPremium(activity.recentPutPremium)} vs avg{" "}
                          {formatPremium(activity.avgPutPremium)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No unusual activity detected. All flows within normal ranges.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketPulse;
