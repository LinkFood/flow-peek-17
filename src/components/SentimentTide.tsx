import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface TideDataPoint {
  timestamp: number;
  callPremium: number;
  putPremium: number;
  netFlow: number;
}

interface SentimentTideProps {
  data: TideDataPoint[];
  height?: number;
}

export const SentimentTide = ({ data, height = 320 }: SentimentTideProps) => {
  // Transform data for stacked area chart
  const chartData = useMemo(() => {
    return data.map(point => ({
      timestamp: point.timestamp,
      calls: point.callPremium,
      puts: -Math.abs(point.putPremium), // Negative for bottom area
      netFlow: point.netFlow,
    }));
  }, [data]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const time = new Date(data.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <div className="bg-card border border-border rounded p-3 shadow-lg">
        <div className="text-xs text-muted-foreground mb-2">{time}</div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-green-400">Calls:</span>
            <span className="font-mono font-semibold">${(Math.abs(data.calls) / 1000000).toFixed(2)}M</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-red-400">Puts:</span>
            <span className="font-mono font-semibold">${(Math.abs(data.puts) / 1000000).toFixed(2)}M</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-border">
            <span className={data.netFlow > 0 ? "text-green-400" : "text-red-400"}>Net:</span>
            <span className="font-mono font-semibold">${(data.netFlow / 1000000).toFixed(2)}M</span>
          </div>
        </div>
      </div>
    );
  };

  // Format Y axis
  const formatYAxis = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
    if (abs >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  // Format X axis
  const formatXAxis = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-sm">Insufficient data for sentiment tide</div>
          <div className="text-xs mt-1">Waiting for flow data...</div>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#00ff9d" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="putGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ff0066" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#ff0066" stopOpacity={0.8} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" opacity={0.3} />

        <XAxis
          dataKey="timestamp"
          tickFormatter={formatXAxis}
          stroke="#6e7681"
          style={{ fontSize: '11px', fontFamily: 'monospace' }}
          tickLine={false}
        />

        <YAxis
          tickFormatter={formatYAxis}
          stroke="#6e7681"
          style={{ fontSize: '11px', fontFamily: 'monospace' }}
          tickLine={false}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#00d4ff', strokeWidth: 1 }} />

        {/* Zero reference line */}
        <ReferenceLine
          y={0}
          stroke="#6e7681"
          strokeWidth={2}
          strokeDasharray="3 3"
          label={{ value: 'NEUTRAL', position: 'right', fill: '#6e7681', fontSize: 10 }}
        />

        {/* Put area (bottom, negative values) */}
        <Area
          type="monotone"
          dataKey="puts"
          stackId="1"
          stroke="#ff0066"
          strokeWidth={2}
          fill="url(#putGradient)"
        />

        {/* Call area (top, positive values) */}
        <Area
          type="monotone"
          dataKey="calls"
          stackId="1"
          stroke="#00ff9d"
          strokeWidth={2}
          fill="url(#callGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
