import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Sparkles, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { getInsights, getMarketInsights, getTickers } from "@/lib/api";

const AIInsights = () => {
  const [selectedTicker, setSelectedTicker] = useState("QQQ");
  const [windowHours, setWindowHours] = useState("24");

  // Fetch available tickers
  const { data: tickers } = useQuery({
    queryKey: ["tickers"],
    queryFn: getTickers,
  });

  // Fetch ticker-specific insights
  const {
    data: tickerInsights,
    isLoading: isLoadingTicker,
    refetch: refetchTicker,
    error: tickerError,
  } = useQuery({
    queryKey: ["insights", selectedTicker, windowHours],
    queryFn: () => getInsights(selectedTicker, parseInt(windowHours)),
    enabled: !!selectedTicker,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch market-wide insights
  const {
    data: marketInsights,
    isLoading: isLoadingMarket,
    refetch: refetchMarket,
    error: marketError,
  } = useQuery({
    queryKey: ["market-insights"],
    queryFn: getMarketInsights,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <div className="bg-card border-b border-border px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Insights
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              OpenAI-powered analysis of options flow patterns
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6">
        <Tabs defaultValue="ticker" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="ticker">
              <TrendingUp className="h-4 w-4 mr-2" />
              Ticker Analysis
            </TabsTrigger>
            <TabsTrigger value="market">
              <Sparkles className="h-4 w-4 mr-2" />
              Market Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ticker" className="space-y-6">
            {/* Ticker Selection Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Settings</CardTitle>
                <CardDescription>Select a ticker and time window for AI analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Ticker Symbol</label>
                    <Select value={selectedTicker} onValueChange={setSelectedTicker}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ticker" />
                      </SelectTrigger>
                      <SelectContent>
                        {tickers && tickers.length > 0 ? (
                          tickers.map((ticker) => (
                            <SelectItem key={ticker} value={ticker}>
                              {ticker}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="QQQ">QQQ</SelectItem>
                            <SelectItem value="SPY">SPY</SelectItem>
                            <SelectItem value="TSLA">TSLA</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Time Window</label>
                    <Select value={windowHours} onValueChange={setWindowHours}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">Last 4 hours</SelectItem>
                        <SelectItem value="8">Last 8 hours</SelectItem>
                        <SelectItem value="24">Last 24 hours</SelectItem>
                        <SelectItem value="48">Last 48 hours</SelectItem>
                        <SelectItem value="168">Last week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={() => refetchTicker()}
                      disabled={isLoadingTicker}
                      className="w-full"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingTicker ? "animate-spin" : ""}`} />
                      Refresh Analysis
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ticker Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>AI Analysis for {selectedTicker}</span>
                  {tickerInsights && (
                    <span className="text-xs text-muted-foreground font-normal">
                      Generated {formatTimestamp(tickerInsights.timestamp)}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Professional trader analysis of {selectedTicker} options flow from the last{" "}
                  {windowHours} hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTicker ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : tickerError ? (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Error loading insights</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {tickerError instanceof Error ? tickerError.message : "An error occurred"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Make sure OpenAI API key is configured and backend is running.
                      </p>
                    </div>
                  </div>
                ) : tickerInsights ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                      {tickerInsights.analysis}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Select a ticker and click "Refresh Analysis" to generate insights.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="market" className="space-y-6">
            {/* Market Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Market-Wide Flow Analysis</span>
                  {marketInsights && (
                    <span className="text-xs text-muted-foreground font-normal">
                      Generated {formatTimestamp(marketInsights.timestamp)}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  AI-powered overview of options flow across all active tickers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Button
                    onClick={() => refetchMarket()}
                    disabled={isLoadingMarket}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingMarket ? "animate-spin" : ""}`} />
                    Refresh Market Analysis
                  </Button>
                </div>

                {isLoadingMarket ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : marketError ? (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Error loading market insights</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {marketError instanceof Error ? marketError.message : "An error occurred"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Make sure OpenAI API key is configured and backend is running.
                      </p>
                    </div>
                  </div>
                ) : marketInsights ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                      {marketInsights.analysis}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Click "Refresh Market Analysis" to generate insights.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">About Market Insights</p>
                    <p className="text-muted-foreground mt-1">
                      Market insights analyze flow data across the top 10 most active tickers in the last
                      24 hours, identifying overall sentiment, notable institutional activity, and key
                      trading opportunities.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AIInsights;
