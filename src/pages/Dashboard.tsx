import { useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { SummaryCard } from "@/components/SummaryCard";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { mockFlowData, formatPremium, formatTime, formatDate } from "@/lib/mockData";

const Dashboard = () => {
  const [ticker, setTicker] = useState("QQQ");
  const [minPremium, setMinPremium] = useState("");
  const [timeWindow, setTimeWindow] = useState("1d");

  // Calculate summary stats
  const totalCallPremium = mockFlowData
    .filter((f) => f.side === "CALL")
    .reduce((sum, f) => sum + f.premium, 0);
  
  const totalPutPremium = mockFlowData
    .filter((f) => f.side === "PUT")
    .reduce((sum, f) => sum + f.premium, 0);
  
  const netPremium = totalCallPremium - totalPutPremium;

  // Find most active expiry
  const expiryCount: Record<string, number> = {};
  mockFlowData.forEach((f) => {
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
          <SummaryCard
            title="Total Call Premium"
            value={formatPremium(totalCallPremium)}
            icon={TrendingUp}
            trend="up"
          />
          <SummaryCard
            title="Total Put Premium"
            value={formatPremium(totalPutPremium)}
            icon={TrendingDown}
            trend="down"
          />
          <SummaryCard
            title="Net Premium (Call - Put)"
            value={formatPremium(netPremium)}
            icon={DollarSign}
            trend={netPremium > 0 ? "up" : netPremium < 0 ? "down" : "neutral"}
          />
          <SummaryCard
            title="Most Active Expiry"
            value={formatDate(mostActiveExpiry)}
            icon={Calendar}
          />
        </div>

        <div className="bg-card rounded-lg border border-border shadow-md overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Latest Option Flows</h3>
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
                {mockFlowData.map((flow) => (
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
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
