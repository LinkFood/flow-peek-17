import { useQuery } from '@tanstack/react-query';
import { getStrikeConcentration, type StrikeConcentration } from '@/lib/api';
import { format } from 'date-fns';

interface StrikeHeatmapProps {
  symbol: string;
  lookbackHours?: number;
}

export function StrikeHeatmap({ symbol, lookbackHours = 48 }: StrikeHeatmapProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['strike-concentration', symbol, lookbackHours],
    queryFn: () => getStrikeConcentration(symbol, lookbackHours, 2),
    refetchInterval: 60000, // Refresh every minute
  });

  // Get color intensity based on premium amount
  const getHeatColor = (premium: number, maxPremium: number) => {
    const intensity = Math.min(premium / maxPremium, 1);

    if (intensity > 0.8) return 'bg-red-600/90 text-white';
    if (intensity > 0.6) return 'bg-red-500/80 text-white';
    if (intensity > 0.4) return 'bg-orange-500/70 text-white';
    if (intensity > 0.2) return 'bg-yellow-500/60 text-slate-900';
    return 'bg-green-500/50 text-slate-900';
  };

  // Get flow grade badge color
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-purple-600 text-white';
      case 'A': return 'bg-blue-600 text-white';
      case 'B': return 'bg-green-600 text-white';
      case 'C': return 'bg-yellow-600 text-slate-900';
      case 'D': return 'bg-slate-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-slate-400 text-sm">Loading strike data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
        <p className="text-red-400 text-sm">Failed to load strike concentration data</p>
      </div>
    );
  }

  if (!data || data.strikes.length === 0) {
    return (
      <div className="bg-slate-800/30 rounded-lg p-6 text-center">
        <p className="text-slate-400 text-sm">No strike concentration data available</p>
        <p className="text-slate-500 text-xs mt-1">Need at least 2 hits per strike</p>
      </div>
    );
  }

  const maxPremium = Math.max(...data.strikes.map(s => s.totalPremium));

  // Group by expiry date
  const strikesByExpiry = data.strikes.reduce((acc, strike) => {
    if (!acc[strike.expiry]) {
      acc[strike.expiry] = [];
    }
    acc[strike.expiry].push(strike);
    return {};
  }, {} as Record<string, StrikeConcentration[]>);

  // Sort expiries chronologically
  const sortedExpiries = Object.keys(strikesByExpiry).sort();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{symbol} Strike Concentration</h3>
          <p className="text-xs text-slate-400">Last {lookbackHours} hours • {data.count} hot strikes</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Heat:</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-green-500/50 rounded"></div>
            <div className="w-4 h-4 bg-yellow-500/60 rounded"></div>
            <div className="w-4 h-4 bg-orange-500/70 rounded"></div>
            <div className="w-4 h-4 bg-red-500/80 rounded"></div>
            <div className="w-4 h-4 bg-red-600/90 rounded"></div>
          </div>
          <span className="text-slate-400">High</span>
        </div>
      </div>

      {/* Strike Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {data.strikes.map((strike, idx) => {
          const heatColor = getHeatColor(strike.totalPremium, maxPremium);
          const gradeColor = getGradeColor(strike.flowGrade);

          return (
            <div
              key={idx}
              className={`${heatColor} rounded-lg p-3 transition-all hover:scale-105 cursor-pointer`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">${strike.strike.toFixed(2)}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${gradeColor}`}>
                      {strike.flowGrade}
                    </span>
                  </div>
                  <p className="text-xs opacity-80">
                    {strike.side === 'CALL' ? '📞 CALL' : '📉 PUT'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{strike.hitCount}x</p>
                  <p className="text-xs opacity-80">hits</p>
                </div>
              </div>

              <div className="space-y-1 text-xs opacity-90">
                <div className="flex justify-between">
                  <span>Premium:</span>
                  <span className="font-semibold">
                    ${(strike.totalPremium / 1000000).toFixed(2)}M
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span className="font-semibold">{strike.totalSize.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expiry:</span>
                  <span className="font-semibold">{format(new Date(strike.expiry), 'MMM d')}</span>
                </div>
                <div className="flex justify-between">
                  <span>DTE:</span>
                  <span className="font-semibold">{strike.dte}d</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-slate-800/30 rounded-lg p-3">
        <p className="text-xs text-slate-400 mb-2 font-semibold">Flow Grade Legend:</p>
        <div className="grid grid-cols-5 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className={`px-2 py-0.5 rounded ${getGradeColor('A+')}`}>A+</span>
            <span className="text-slate-400">10+ hits</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`px-2 py-0.5 rounded ${getGradeColor('A')}`}>A</span>
            <span className="text-slate-400">7-9 hits</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`px-2 py-0.5 rounded ${getGradeColor('B')}`}>B</span>
            <span className="text-slate-400">5-6 hits</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`px-2 py-0.5 rounded ${getGradeColor('C')}`}>C</span>
            <span className="text-slate-400">3-4 hits</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`px-2 py-0.5 rounded ${getGradeColor('D')}`}>D</span>
            <span className="text-slate-400">2 hits</span>
          </div>
        </div>
      </div>
    </div>
  );
}
