import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { FilterBar } from "@/components/FilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPremium, formatTime, formatDate } from "@/lib/mockData";
import { getBuildingFlow, getSummary, getFlowTimeline, getStrikeConcentration } from "@/lib/api";
import { BarChart3, Activity, TrendingUp, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StrikeScorecard } from "@/components/StrikeScorecard";

const TickerView = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [ticker, setTicker] = useState(symbol || "QQQ");
  const [minPremium, setMinPremium] = useState("50000");
  const [timeWindow, setTimeWindow] = useState("1d");

  // Sync ticker with URL param
  useEffect(() => {
    if (symbol) {
      setTicker(symbol);
    }
  }, [symbol]);

  // Convert time window to minutes for building endpoint
  const lookbackMinutes = timeWindow === "1d" ? 1440 : timeWindow === "1w" ? 10080 : 1440;
  const timeWindowHours = timeWindow === "1d" ? 24 : timeWindow === "1w" ? 168 : 24;

  // Fetch position building data
  const { data: buildingFlows, isLoading: isLoadingBuilding } = useQuery({
    queryKey: ["building-flow", ticker, minPremium, lookbackMinutes],
    queryFn: () => getBuildingFlow(ticker, parseInt(minPremium) || 50000, lookbackMinutes),
    refetchInterval: 30000,
  });

  // Fetch summary for the charts
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["summary", ticker, timeWindowHours],
    queryFn: () => getSummary(ticker, timeWindowHours),
    refetchInterval: 30000,
  });

  // Fetch flow timeline for chart
  const { data: timelineData, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ["timeline", ticker, timeWindowHours],
    queryFn: () => getFlowTimeline(ticker, timeWindowHours, 60),
    refetchInterval: 30000,
  });

  // Fetch strike concentration
  const { data: strikeData, isLoading: isLoadingStrikes } = useQuery({
    queryKey: ["strikes", ticker, timeWindowHours],
    queryFn: () => getStrikeConcentration(ticker, timeWindowHours * 2, 2),
    refetchInterval: 30000,
  });

  // Analyze building flows for signals
  const callFlows = buildingFlows?.filter(f => f.side === "CALL") || [];
  const putFlows = buildingFlows?.filter(f => f.side === "PUT") || [];
  const totalCallPremium = callFlows.reduce((sum, f) => sum + f.premium, 0);
  const totalPutPremium = putFlows.reduce((sum, f) => sum + f.premium, 0);

  const hasStrongCallBuying = callFlows.length > 0 && totalCallPremium > totalPutPremium * 1.5;
  const hasStrongPutBuying = putFlows.length > 0 && totalPutPremium > totalCallPremium * 1.5;
  const hasLargeBlock = buildingFlows?.some(f => f.premium >= 200000) || false;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <FilterBar
        ticker={ticker}
        setTicker={setTicker}
        minPremium={minPremium}
        setMinPremium={setMinPremium}
        timeWindow={timeWindow}
        setTimeWindow={setTimeWindow}
      />

      <main className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-1">
            Ticker View: <span className="text-primary">{ticker}</span>
          </h2>
          <p className="text-muted-foreground">Detailed flow analysis for {ticker}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Flow Direction Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <div className="h-32 flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : summaryData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-call-color/10 rounded-lg">
                    <span className="font-medium">Call Premium</span>
                    <span className="text-lg font-bold text-call-color">
                      {formatPremium(summaryData.totalCallPremium)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-put-color/10 rounded-lg">
                    <span className="font-medium">Put Premium</span>
                    <span className="text-lg font-bold text-put-color">
                      {formatPremium(summaryData.totalPutPremium)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                    <span className="font-medium">Net Flow</span>
                    <span className={`text-lg font-bold ${summaryData.netPremium > 0 ? 'text-call-color' : 'text-put-color'}`}>
                      {formatPremium(summaryData.netPremium)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground text-center pt-2">
                    {summaryData.count} total flows in last {summaryData.windowHours}h
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  No summary data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Position Building Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoadingBuilding ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : (
                  <>
                    {hasStrongCallBuying && (
                      <div className="p-3 bg-call-color/5 border border-call-color/20 rounded-lg">
                        <p className="text-sm font-medium text-call-color">Strong Call Buying</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {callFlows.length} call flows, {formatPremium(totalCallPremium)} total premium
                        </p>
                      </div>
                    )}
                    {hasStrongPutBuying && (
                      <div className="p-3 bg-put-color/5 border border-put-color/20 rounded-lg">
                        <p className="text-sm font-medium text-put-color">Strong Put Buying</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {putFlows.length} put flows, {formatPremium(totalPutPremium)} total premium
                        </p>
                      </div>
                    )}
                    {!hasStrongCallBuying && !hasStrongPutBuying && buildingFlows && buildingFlows.length > 0 && (
                      <div className="p-3 bg-muted/30 border border-border rounded-lg">
                        <p className="text-sm font-medium text-neutral-color">Balanced Activity</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {buildingFlows.length} building flows detected
                        </p>
                      </div>
                    )}
                    {hasLargeBlock && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-sm font-medium text-primary">Large Block Detected</p>
                        <p className="text-xs text-muted-foreground mt-1">Premium above $200K threshold</p>
                      </div>
                    )}
                    {(!buildingFlows || buildingFlows.length === 0) && !isLoadingBuilding && (
                      <div className="p-3 bg-muted/30 border border-border rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          No position building signals detected
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try lowering the premium threshold
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Timeline and Strike Heatmap */}
        <Card className="mb-6">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none">
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Premium Flow Timeline
              </TabsTrigger>
              <TabsTrigger value="strikes" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Strike Heatmap
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="p-6">
              {isLoadingTimeline ? (
                <Skeleton className="h-64 w-full" />
              ) : timelineData && timelineData.dataPoints.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timelineData.dataPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(ts) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      stroke="#888"
                    />
                    <YAxis
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                      stroke="#888"
                    />
                    <Tooltip
                      labelFormatter={(ts) => new Date(ts).toLocaleString()}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="callPremium"
                      stroke="#22c55e"
                      strokeWidth={2}
                      name="Call Premium"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="putPremium"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Put Premium"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="netFlow"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Net Flow"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No timeline data available. Markets may be closed or no data for {ticker}.
                </div>
              )}
            </TabsContent>

            <TabsContent value="strikes" className="p-6">
              {isLoadingStrikes ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : strikeData && strikeData.strikes.length > 0 ? (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Showing {strikeData.count} concentrated strikes with 2+ hits
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Lookback: {strikeData.lookbackHours}h • Sorted by total premium
                      </p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50" />
                        <span>A+ Grade</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-500/10 border border-green-500/30" />
                        <span>A Grade</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-yellow-500/10 border border-yellow-500/30" />
                        <span>B Grade</span>
                      </div>
                    </div>
                  </div>
                  <StrikeScorecard strikes={strikeData.strikes} />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No strike concentration detected for {ticker}</p>
                    <p className="text-xs mt-2">Try adjusting the time window or check during market hours</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        <div className="bg-card rounded-lg border border-border shadow-md overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Position Building Flows</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Flows with premium ≥ {formatPremium(parseInt(minPremium) || 50000)} in last {timeWindow}
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Option Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Strike</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingBuilding ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : buildingFlows && buildingFlows.length > 0 ? (
                  buildingFlows.map((flow) => (
                    <TableRow key={flow.id}>
                      <TableCell className="font-mono text-sm">{formatTime(flow.tsUtc)}</TableCell>
                      <TableCell className="font-mono text-xs">{flow.optionSymbol}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={flow.side === "CALL" ? "call-badge" : "put-badge"}
                        >
                          {flow.side}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatPremium(flow.premium)}</TableCell>
                      <TableCell>{formatDate(flow.expiry)}</TableCell>
                      <TableCell className="text-right font-mono">${flow.strike}</TableCell>
                      <TableCell className="text-right">{flow.size}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No building flows found for {ticker}. Try adjusting the premium threshold or time window.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TickerView;
