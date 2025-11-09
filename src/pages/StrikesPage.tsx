import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StrikeHeatmap } from '@/components/StrikeHeatmap';
import { ArrowLeft } from 'lucide-react';

const TRACKED_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'SPY', 'QQQ'];

export default function StrikesPage() {
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [lookbackHours, setLookbackHours] = useState(48);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/river"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to River Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">
            Strike Concentration Analysis
          </h1>
          <p className="text-slate-400">
            Identify where institutional money is clustering by strike and expiration
          </p>
        </div>

        {/* Controls */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ticker Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Select Ticker
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TRACKED_TICKERS.map(ticker => (
                  <button
                    key={ticker}
                    onClick={() => setSelectedTicker(ticker)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      selectedTicker === ticker
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            </div>

            {/* Lookback Period */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Lookback Period
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[24, 48, 72].map(hours => (
                  <button
                    key={hours}
                    onClick={() => setLookbackHours(hours)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      lookbackHours === hours
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
          <StrikeHeatmap symbol={selectedTicker} lookbackHours={lookbackHours} />
        </div>

        {/* Info Panel */}
        <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">💡 How to Read This</h3>
          <ul className="space-y-1 text-sm text-slate-300">
            <li>• <strong>Heat Color:</strong> Darker red = more premium concentrated at that strike</li>
            <li>• <strong>Hit Count:</strong> Number of times large flow hit this strike</li>
            <li>• <strong>Flow Grade:</strong> A+ = 10+ hits (very hot), D = 2 hits (warm)</li>
            <li>• <strong>Multiple Hits = Conviction:</strong> When institutions keep hitting the same strike, they believe something will happen</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
