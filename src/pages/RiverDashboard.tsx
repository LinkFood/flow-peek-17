import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { DateModePicker } from '@/components/DateModePicker';
import { RiverLineChart } from '@/components/RiverLineChart';
import { CombinedIndexChart } from '@/components/CombinedIndexChart';
import {
  getMultiTickerTimeline,
  getFastMultiTickerChart,
  TRACKED_TICKERS,
  type TimelineResponse,
  type FastTimelineDataPoint
} from '@/lib/api';
import { exportMultiTickerToCSV } from '@/lib/csvExport';

const MAG7_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META'] as const;

export default function RiverDashboard() {
  const [isLive, setIsLive] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });

  // Fetch data for all 9 tickers
  const { data: allTimelines, isLoading, error } = useQuery({
    queryKey: ['multi-timeline', isLive ? 'live' : format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (isLive) {
        // LIVE mode: Use time-window query (last 24 hours)
        return getMultiTickerTimeline(
          TRACKED_TICKERS as any,
          24,
          15,
          true // cumulative
        );
      } else {
        // HISTORICAL mode: Use FAST multi-ticker API (45x faster!)
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        try {
          // Single API call for all 9 tickers - much faster!
          const fastData = await getFastMultiTickerChart(
            TRACKED_TICKERS as any,
            dateStr,
            '09:30',
            '16:00'
          );

          // Convert fast API response to TimelineResponse format
          const result: { [symbol: string]: TimelineResponse } = {};

          for (const ticker of TRACKED_TICKERS) {
            const tickerData = fastData.tickers[ticker];
            if (tickerData) {
              result[ticker] = {
                symbol: ticker,
                windowHours: 24,
                bucketMinutes: 1, // 1-minute buckets now!
                dataPoints: tickerData.dataPoints.map((point: FastTimelineDataPoint) => ({
                  timestamp: new Date(point.timestamp).getTime(),
                  callPremium: point.cumulativeCall,
                  putPremium: point.cumulativePut,
                  netFlow: point.cumulativeNet,
                  callCount: point.callCount,
                  putCount: point.putCount
                })),
                cumulative: true
              };
            } else {
              // No data for this ticker
              result[ticker] = {
                symbol: ticker,
                windowHours: 24,
                bucketMinutes: 1,
                dataPoints: [],
                cumulative: true
              };
            }
          }

          return result;
        } catch (err) {
          console.error('Failed to fetch fast multi-ticker data:', err);
          // Fallback: return empty data for all tickers
          return Object.fromEntries(
            TRACKED_TICKERS.map(ticker => [
              ticker,
              { symbol: ticker, windowHours: 24, bucketMinutes: 1, dataPoints: [], cumulative: true }
            ])
          );
        }
      }
    },
    refetchInterval: isLive ? 30000 : false, // Refresh every 30s in live mode
  });

  // Extract SPY and QQQ data
  const spyData = allTimelines?.SPY?.dataPoints || [];
  const qqqData = allTimelines?.QQQ?.dataPoints || [];

  // Get 0DTE status (Friday = all tickers, other days = only SPY/QQQ)
  const isFriday = selectedDate.getDay() === 5;
  const zeroDTETickers = isFriday ? [...MAG7_TICKERS, 'SPY', 'QQQ'] : ['SPY', 'QQQ'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3">
      {/* Header - Compact */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            River Flow Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Real-time premium flow tracking for MAG7 + SPY + QQQ
          </p>
        </div>
        <button
          onClick={() => allTimelines && exportMultiTickerToCSV(allTimelines, selectedDate)}
          disabled={!allTimelines || isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Date/Mode Picker - Full Width */}
      <DateModePicker
        isLive={isLive}
        selectedDate={selectedDate}
        onModeChange={setIsLive}
        onDateChange={setSelectedDate}
      />

      {/* Main Layout: Charts (Left) + AI Bot (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-3">
        {/* LEFT COLUMN: Charts */}
        <div className="space-y-3">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-md">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-400 text-sm font-medium mb-1">
                  {isLive ? 'Loading live flow data...' : `Loading ${format(selectedDate, 'MMM d, yyyy')} data...`}
                </p>
                <p className="text-slate-500 text-xs">
                  {isLive
                    ? 'Fetching data for all 9 tickers'
                    : 'Using fast 1-minute aggregations (sub-2 second load)'}
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <p className="text-red-400 font-semibold mb-1">Failed to Load Data</p>
                  <p className="text-red-300 text-sm mb-2">{error.message}</p>
                  <p className="text-slate-400 text-xs">
                    {isLive
                      ? 'Try switching to HISTORICAL mode or check your network connection.'
                      : 'This date may not have data yet. Try selecting a different date.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Empty State - No data available */}
          {!isLoading && !error && allTimelines && Object.keys(allTimelines).length > 0 && (
            (() => {
              const hasAnyData = Object.values(allTimelines).some(
                (timeline: any) => timeline?.dataPoints?.length > 0
              );

              if (!hasAnyData) {
                return (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-8 text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Flow Data Available</h3>
                    <p className="text-slate-400 mb-4">
                      {isLive
                        ? 'No trades detected in the last 24 hours. Markets may be closed or flow is quiet.'
                        : `No flow data found for ${format(selectedDate, 'EEEE, MMM d, yyyy')}.`}
                    </p>
                    <div className="flex gap-2 justify-center">
                      {!isLive && (
                        <button
                          onClick={() => setIsLive(true)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          Switch to LIVE Mode
                        </button>
                      )}
                      <button
                        onClick={() => window.location.href = '/admin'}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Load Test Data
                      </button>
                    </div>
                  </div>
                );
              }
              return null;
            })()
          )}

          {/* 0DTE Section - COMPACT */}
          {!isLoading && allTimelines && (
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-white">
                  🎯 0DTE (Same-Day)
                </h2>
                {isFriday && (
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold">
                    Friday
                  </span>
                )}
              </div>

              {/* SPY & QQQ Combined Chart - COMPACT */}
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-slate-300 mb-1">
                  SPY & QQQ
                </h3>
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <CombinedIndexChart
                    spyData={spyData}
                    qqqData={qqqData}
                    height={200}
                  />
                </div>
              </div>

              {/* MAG7 0DTE (Friday Only) - COMPACT GRID */}
              {isFriday && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-1">
                    MAG7 (Friday Only)
                  </h3>
                  <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
                    {MAG7_TICKERS.map(ticker => {
                      const tickerData = allTimelines[ticker]?.dataPoints || [];
                      return (
                        <div key={ticker} className="bg-slate-800/50 rounded-lg p-2">
                          <h4 className="text-xs font-bold text-white mb-1">{ticker}</h4>
                          <RiverLineChart
                            symbol={ticker}
                            dataPoints={tickerData}
                            showLegend={false}
                            height={100}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Flow Section - COMPACT GRID */}
          {!isLoading && allTimelines && (
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3">
              <h2 className="text-lg font-bold text-white mb-2">
                📈 Full Flow (All 0-30 DTE)
              </h2>

              {/* SPY & QQQ Combined (Full Flow) - COMPACT */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-300 mb-1">
                  SPY & QQQ Market
                </h3>
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <CombinedIndexChart
                    spyData={spyData}
                    qqqData={qqqData}
                    height={220}
                  />
                </div>
              </div>

              {/* MAG7 Grid - 2x4 layout with smaller charts */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-1">
                  MAG7 Individual Flow
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {MAG7_TICKERS.map(ticker => {
                    const tickerData = allTimelines[ticker]?.dataPoints || [];

                    return (
                      <div key={ticker} className="bg-slate-800/50 rounded-lg p-2">
                        <h3 className="text-sm font-bold text-white mb-1">{ticker}</h3>
                        <RiverLineChart
                          symbol={ticker}
                          dataPoints={tickerData}
                          showLegend={false}
                          height={150}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: AI Bot - Always Visible */}
        <div className="lg:sticky lg:top-3 lg:h-screen lg:overflow-y-auto">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3 min-h-[600px] flex flex-col">
            {/* AI Bot Header */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700/50">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-lg">🤖</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">AI Flow Analyst</h2>
                <p className="text-xs text-slate-400">Real-time insights & chat</p>
              </div>
            </div>

            {/* AI Insights Feed */}
            <div className="flex-1 space-y-2 mb-3 overflow-y-auto">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-2">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 text-xs">💬</span>
                  <div className="flex-1">
                    <p className="text-xs text-blue-300 font-semibold mb-1">
                      {isLive ? 'Live Analysis' : 'Historical Analysis'}
                    </p>
                    <p className="text-xs text-slate-300">
                      {isLive
                        ? 'Monitoring real-time flow for unusual patterns...'
                        : `Analyzing flow data from ${format(selectedDate, 'MMM d, yyyy')}...`
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-2">
                <div className="flex items-start gap-2">
                  <span className="text-green-400 text-xs">📊</span>
                  <div className="flex-1">
                    <p className="text-xs text-green-300 font-semibold mb-1">
                      Market Sentiment
                    </p>
                    <p className="text-xs text-slate-300">
                      Call/Put ratio analysis in progress...
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-2">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400 text-xs">⚡</span>
                  <div className="flex-1">
                    <p className="text-xs text-yellow-300 font-semibold mb-1">
                      Key Insights Coming Soon
                    </p>
                    <p className="text-xs text-slate-300">
                      AI will detect unusual flow patterns, strike clustering, and directional shifts
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="pt-3 border-t border-slate-700/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask about flow patterns..."
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  disabled
                />
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-semibold transition-colors"
                  disabled
                >
                  Send
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                AI chatbot integration coming soon
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
