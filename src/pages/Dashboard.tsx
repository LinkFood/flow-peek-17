import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterBar } from "@/components/FilterBar";
import { SummaryCard } from "@/components/SummaryCard";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPremium, formatTime, formatDate } from "@/lib/mockData";
import { getLatestFlow, getSummary, convertToOptionFlow } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const [ticker, setTicker] = useState("QQQ");
  const [minPremium, setMinPremium] = useState("");
  const [timeWindow, setTimeWindow] = useState("1d");

  // Convert time window to hours
  const timeWindowHours = timeWindow === "1d" ? 24 : timeWindow === "1w" ? 168 : 24;

  // Fetch latest flow data
  const { data: latestData, isLoading: isLoadingLatest } = useQuery({
    queryKey: ["latest-flow", ticker],
    queryFn: () => getLatestFlow(ticker, 50),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch summary data
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["summary", ticker, timeWindowHours],
    queryFn: () => getSummary(ticker, timeWindowHours),
    refetchInterval: 30000,
  });

  // Convert API data to frontend format
  const flowData = latestData?.rows.map((flow, idx) =>
    convertToOptionFlow(flow, String(idx + 1), ticker)
  ) || [];

  // Calculate most active expiry from the flow data
  const expiryCount: Record<string, number> = {};
  flowData.forEach((f) => {
    expiryCount[f.expiry] = (expiryCount[f.expiry] || 0) + 1;
  });
  const mostActiveExpiry = Object.entries(expiryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

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
          <h2 className="text-3xl font-bold text-foreground mb-1">Dashboard</h2>
          <p className="text-muted-foreground">Latest options flow activity</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isLoadingSummary ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card rounded-lg border border-border p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </>
          ) : summaryData ? (
            <>
              <SummaryCard
                title="Total Call Premium"
                value={formatPremium(summaryData.totalCallPremium)}
                icon={TrendingUp}
                trend="up"
              />
              <SummaryCard
                title="Total Put Premium"
                value={formatPremium(summaryData.totalPutPremium)}
                icon={TrendingDown}
                trend="down"
              />
              <SummaryCard
                title="Net Premium (Call - Put)"
                value={formatPremium(summaryData.netPremium)}
                icon={DollarSign}
                trend={summaryData.netPremium > 0 ? "up" : summaryData.netPremium < 0 ? "down" : "neutral"}
              />
              <SummaryCard
                title="Most Active Expiry"
                value={mostActiveExpiry !== "N/A" ? formatDate(mostActiveExpiry) : "N/A"}
                icon={Calendar}
              />
            </>
          ) : null}
        </div>

        <div className="bg-card rounded-lg border border-border shadow-md overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Latest Option Flows</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {latestData ? `Showing ${latestData.count} most recent flows for ${ticker}` : "Loading..."}
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time (UTC)</TableHead>
                  <TableHead>Underlying</TableHead>
                  <TableHead>Option Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Strike</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingLatest ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : flowData.length > 0 ? (
                  flowData.map((flow) => (
                    <TableRow key={flow.id}>
                      <TableCell className="font-mono text-sm">{formatTime(flow.ts_utc)}</TableCell>
                      <TableCell className="font-bold">{flow.underlying}</TableCell>
                      <TableCell className="font-mono text-xs">{flow.option_symbol}</TableCell>
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
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No flow data available for {ticker}. The backend may be empty or not running.
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

export default Dashboard;
