import { useState } from 'react';
import { subDays, format } from 'date-fns';
import { loadSampleData, fetchHistoricalPrices } from '@/lib/api';

export function DataLoader() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLoadSampleData = async (days: number) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await loadSampleData(days, false);
      setResult(`✅ Loaded ${response.totalTrades} trades across ${response.daysGenerated} days`);
    } catch (err: any) {
      setError(`❌ Failed to load sample data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPriceData = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Load last 7 trading days of price data
      const dates = [];
      let daysBack = 0;
      while (dates.length < 7) {
        const date = subDays(new Date(), daysBack);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          dates.push(format(date, 'yyyy-MM-dd'));
        }
        daysBack++;
      }

      const results = await Promise.all(
        dates.map(date => fetchHistoricalPrices(date))
      );

      const totalBars = results.reduce((sum, r) => {
        return sum + Object.values(r.results).reduce((a, b) => a + b, 0);
      }, 0);

      setResult(`✅ Loaded ${totalBars} price bars across ${dates.length} days`);
    } catch (err: any) {
      setError(`❌ Failed to load price data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-4">
        📦 Data Loading Utility
      </h2>
      <p className="text-slate-400 mb-6">
        Load historical data for testing the River Dashboard before going live
      </p>

      <div className="space-y-4">
        {/* Sample Flow Data */}
        <div className="bg-slate-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">
            Load Sample Flow Data
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Generates synthetic options flow data for testing river lines
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleLoadSampleData(2)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-semibold transition-colors"
            >
              Load 2 Days
            </button>
            <button
              onClick={() => handleLoadSampleData(7)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-semibold transition-colors"
            >
              Load 7 Days
            </button>
          </div>
        </div>

        {/* Real Price Data */}
        <div className="bg-slate-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">
            Load Real Price Data
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Fetches actual stock prices from Massive.com for date overlays
          </p>
          <button
            onClick={handleLoadPriceData}
            disabled={loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-semibold transition-colors"
          >
            Load 7 Days of Prices
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <span className="text-blue-400">Loading data...</span>
          </div>
        )}

        {/* Success State */}
        {result && (
          <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
            <p className="text-green-400 font-semibold">{result}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400 font-semibold">{error}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">
          💡 Testing Workflow
        </h4>
        <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
          <li>Load 7 days of sample flow data</li>
          <li>Load 7 days of real price data</li>
          <li>Go to River Dashboard and test date picker</li>
          <li>Verify river lines render correctly</li>
          <li>Once verified, you're ready for Monday live data!</li>
        </ol>
      </div>
    </div>
  );
}
