import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { DateModePicker } from '@/components/DateModePicker';
import { RiverLineChart } from '@/components/RiverLineChart';
import { CombinedIndexChart } from '@/components/CombinedIndexChart';
import {
  getMultiTickerTimeline,
  TRACKED_TICKERS,
  type TimelineResponse
} from '@/lib/api';

const MAG7_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META'] as const;

export default function RiverDashboard() {
  const [isLive, setIsLive] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch data for all 9 tickers
  const { data: allTimelines, isLoading, error } = useQuery({
    queryKey: ['multi-timeline', isLive ? 'live' : format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => getMultiTickerTimeline(
      TRACKED_TICKERS as any,
      24,
      15,
      true // cumulative
    ),
    refetchInterval: isLive ? 30000 : false, // Refresh every 30s in live mode
  });

  // Extract SPY and QQQ data
  const spyData = allTimelines?.SPY?.dataPoints || [];
  const qqqData = allTimelines?.QQQ?.dataPoints || [];

  // Get 0DTE status (Friday = all tickers, other days = only SPY/QQQ)
  const isFriday = selectedDate.getDay() === 5;
  const zeroDTETickers = isFriday ? [...MAG7_TICKERS, 'SPY', 'QQQ'] : ['SPY', 'QQQ'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          River Flow Dashboard
        </h1>
        <p className="text-slate-400">
          Real-time premium flow tracking for MAG7 + SPY + QQQ
        </p>
      </div>

      {/* Date/Mode Picker */}
      <DateModePicker
        isLive={isLive}
        selectedDate={selectedDate}
        onModeChange={setIsLive}
        onDateChange={setSelectedDate}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading flow data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-400">Error loading data: {error.message}</p>
        </div>
      )}

      {/* 0DTE Section */}
      {!isLoading && allTimelines && (
        <div className="mb-8">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">
                🎯 0DTE Flow (Same-Day Expiration)
              </h2>
              {isFriday && (
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-semibold">
                  Friday - All Tickers
                </span>
              )}
            </div>

            {/* SPY & QQQ Combined Chart */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-300 mb-3">
                SPY & QQQ Combined
              </h3>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <CombinedIndexChart
                  spyData={spyData}
                  qqqData={qqqData}
                  height={400}
                />
              </div>
            </div>

            {/* MAG7 0DTE (Friday Only) */}
            {isFriday && (
              <div>
                <h3 className="text-lg font-semibold text-slate-300 mb-3">
                  MAG7 0DTE (Friday Only)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {MAG7_TICKERS.map(ticker => {
                    const tickerData = allTimelines[ticker]?.dataPoints || [];
                    return (
                      <div key={ticker} className="bg-slate-800/50 rounded-lg p-4">
                        <h4 className="text-md font-bold text-white mb-2">{ticker}</h4>
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
            )}
          </div>
        </div>
      )}

      {/* Full Flow Section - All Tickers */}
      {!isLoading && allTimelines && (
        <div>
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 mb-4">
            <h2 className="text-2xl font-bold text-white mb-4">
              📈 Full Flow (All 0-30 DTE Premium)
            </h2>

            {/* SPY & QQQ Combined (Full Flow) */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-slate-300 mb-3">
                SPY & QQQ Market Flow
              </h3>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <CombinedIndexChart
                  spyData={spyData}
                  qqqData={qqqData}
                  height={450}
                />
              </div>
            </div>

            {/* Individual MAG7 Tickers */}
            <div className="space-y-6">
              {MAG7_TICKERS.map(ticker => {
                const tickerData = allTimelines[ticker]?.dataPoints || [];

                return (
                  <div key={ticker} className="bg-slate-800/50 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-4">{ticker} Flow</h3>
                    <RiverLineChart
                      symbol={ticker}
                      dataPoints={tickerData}
                      showLegend={true}
                      height={300}
                    />

                    {/* TODO: Add Strike Heatmap Below */}
                    <div className="mt-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <p className="text-slate-400 text-sm text-center">
                        Strike Heatmap (Coming Soon)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI Chatbot Placeholder */}
      <div className="mt-8 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          🤖 AI Flow Analyst
        </h2>
        <div className="bg-slate-800/50 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
          <p className="text-slate-400 text-center">
            AI Chatbot Coming Soon
            <br />
            <span className="text-sm text-slate-500">
              Will analyze flow patterns and answer questions in real-time
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
