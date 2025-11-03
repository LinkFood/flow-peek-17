import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, Database, Wifi, TrendingUp, RefreshCw } from "lucide-react";

const API_BASE = "https://web-production-43dc4.up.railway.app/api";

export default function AdminDebug() {
  const [loading, setLoading] = useState(false);

  // Fetch system health
  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ["system-health"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/system/health`);
      return res.json();
    },
    refetchInterval: 10000, // Refresh every 10s
  });

  // Fetch system stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["system-stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/system/stats`);
      return res.json();
    },
  });

  // Fetch last trades
  const { data: lastTrades, refetch: refetchTrades } = useQuery({
    queryKey: ["last-trades"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/pulse/debug/last-trades?limit=10`);
      return res.json();
    },
  });

  // Load synthetic data mutation
  const loadSyntheticData = useMutation({
    mutationFn: async (daysBack: number) => {
      const res = await fetch(
        `${API_BASE}/pulse/load-historical-data?daysBack=${daysBack}&clearFirst=false`,
        { method: "POST" }
      );
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Generated ${data.totalFlowsGenerated} synthetic trades`);
      refetchHealth();
      refetchStats();
      refetchTrades();
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate data: ${error.message}`);
    },
  });

  // Manual backfill mutation
  const triggerBackfill = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/pulse/backfill-real-data`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: () => {
      toast.success("Backfill triggered successfully");
      setTimeout(() => {
        refetchHealth();
        refetchStats();
        refetchTrades();
      }, 3000);
    },
    onError: (error: Error) => {
      toast.error(`Backfill failed: ${error.message}`);
    },
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">System Debug Panel</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchHealth();
              refetchStats();
              refetchTrades();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>

        {/* System Health */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">System Health</h2>
          </div>

          {health && (
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4" />
                  <span className="text-sm text-muted-foreground">Database</span>
                </div>
                <div className="text-2xl font-bold">{health.database?.totalTrades?.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Trades</div>
                <div className="mt-2 text-sm">
                  Active tickers: <Badge variant="secondary">{health.database?.activeTickers || 0}</Badge>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm text-muted-foreground">WebSocket</span>
                </div>
                <Badge variant={health.websocket?.connected ? "default" : "destructive"} className="text-lg py-1">
                  {health.websocket?.status || "UNKNOWN"}
                </Badge>
                <div className="text-xs text-muted-foreground mt-2">
                  {health.websocket?.connected ? "Streaming live data" : "Market closed or disconnected"}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm text-muted-foreground">Status</span>
                </div>
                <Badge variant="outline" className="text-lg py-1">
                  {health.status}
                </Badge>
                <div className="text-xs text-muted-foreground mt-2">
                  Last check: {new Date(health.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Generate Test Data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate synthetic historical data for testing while waiting for market hours.
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => loadSyntheticData.mutate(1)}
                disabled={loadSyntheticData.isPending}
                variant="outline"
                className="w-full"
              >
                Generate 1 Day (~800 trades)
              </Button>
              <Button
                onClick={() => loadSyntheticData.mutate(7)}
                disabled={loadSyntheticData.isPending}
                variant="outline"
                className="w-full"
              >
                Generate 7 Days (~2,000 trades)
              </Button>
              <Button
                onClick={() => loadSyntheticData.mutate(30)}
                disabled={loadSyntheticData.isPending}
                className="w-full"
              >
                Generate 30 Days (~10,000 trades)
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Manual Backfill</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Trigger immediate backfill from Polygon API (requires market hours for real data).
            </p>
            <Button
              onClick={() => triggerBackfill.mutate()}
              disabled={triggerBackfill.isPending}
              className="w-full"
            >
              Trigger Backfill Now
            </Button>
            <div className="mt-4 text-xs text-muted-foreground">
              Note: Polygon delayed feed only streams during market hours (9:30 AM - 4:00 PM ET, Mon-Fri)
            </div>
          </Card>
        </div>

        {/* Statistics */}
        {stats && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Trade Statistics</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-3">By Ticker (Last 24h)</h4>
                <div className="space-y-2">
                  {Object.entries(stats.tradesByTicker || {}).map(([ticker, count]) => (
                    <div key={ticker} className="flex justify-between items-center">
                      <span className="text-sm font-mono">{ticker}</span>
                      <Badge variant="secondary">{String(count)} trades</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">By Time Range</h4>
                <div className="space-y-2">
                  {Object.entries(stats.tradesByTimeRange || {}).map(([range, count]) => (
                    <div key={range} className="flex justify-between items-center">
                      <span className="text-sm">{range}</span>
                      <Badge variant="outline">{String(count)} trades</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Last Trades */}
        {lastTrades && lastTrades.count > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Last 10 Trades</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Time</th>
                    <th className="text-left py-2">Ticker</th>
                    <th className="text-left py-2">Strike</th>
                    <th className="text-left py-2">Side</th>
                    <th className="text-right py-2">Premium</th>
                    <th className="text-left py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {lastTrades.trades.map((trade: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 font-mono">{trade.underlying}</td>
                      <td className="py-2">${trade.strike}</td>
                      <td className="py-2">
                        <Badge variant={trade.side === "CALL" ? "default" : "destructive"}>{trade.side}</Badge>
                      </td>
                      <td className="py-2 text-right font-mono">${trade.premium?.toLocaleString()}</td>
                      <td className="py-2 text-xs text-muted-foreground">{trade.src}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {lastTrades && lastTrades.count === 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              No trades found. Generate synthetic data or wait for market hours to see real data.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
