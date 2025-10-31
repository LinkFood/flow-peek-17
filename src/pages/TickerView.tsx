import { useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { mockFlowData, formatPremium, formatTime, formatDate } from "@/lib/mockData";
import { BarChart3, Activity } from "lucide-react";

const TickerView = () => {
  const [ticker, setTicker] = useState("QQQ");
  const [minPremium, setMinPremium] = useState("");
  const [timeWindow, setTimeWindow] = useState("1d");

  const tickerFlows = mockFlowData.filter((f) => f.underlying === ticker);
  const highPremiumFlows = tickerFlows
    .filter((f) => f.premium >= 100000)
    .sort((a, b) => b.premium - a.premium);

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
                Intraday Flow Direction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-border">
                <p className="text-muted-foreground">Chart placeholder - Connect to /api/flow/summary</p>
              </div>
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
                <div className="p-3 bg-call-color/5 border border-call-color/20 rounded-lg">
                  <p className="text-sm font-medium text-call-color">Strong Call Buying</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Detected at {formatTime(tickerFlows[0]?.ts_utc || "")}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 border border-border rounded-lg">
                  <p className="text-sm font-medium text-neutral-color">Neutral Sentiment</p>
                  <p className="text-xs text-muted-foreground mt-1">Balanced flow activity</p>
                </div>
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm font-medium text-primary">Large Block Detected</p>
                  <p className="text-xs text-muted-foreground mt-1">Premium above $200K threshold</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle>Premium Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-border">
              <p className="text-muted-foreground">
                Timeline chart placeholder - Connect to /api/flow/summary?symbol={ticker}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="bg-card rounded-lg border border-border shadow-md overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">High-Premium Trades</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Trades with premium ≥ $100,000
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {highPremiumFlows.length > 0 ? (
                  highPremiumFlows.map((flow) => (
                    <TableRow key={flow.id}>
                      <TableCell className="font-mono text-sm">{formatTime(flow.ts_utc)}</TableCell>
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
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No high-premium trades found for {ticker}
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
