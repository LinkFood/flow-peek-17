import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterBar } from "@/components/FilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPremium, formatTime, formatDate } from "@/lib/mockData";
import { getBuildingFlow, getSummary } from "@/lib/api";
import { BarChart3, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const TickerView = () => {
  const [ticker, setTicker] = useState("QQQ");
  const [minPremium, setMinPremium] = useState("50000");
  const [timeWindow, setTimeWindow] = useState("1d");

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
