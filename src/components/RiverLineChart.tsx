import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import { TimelineDataPoint } from '@/lib/api';

interface RiverLineChartProps {
  symbol: string;
  dataPoints: TimelineDataPoint[];
  showLegend?: boolean;
  height?: number;
}

export function RiverLineChart({
  symbol,
  dataPoints,
  showLegend = true,
  height = 300
}: RiverLineChartProps) {
  // Format data for chart
  const chartData = useMemo(() => {
    return dataPoints.map(point => ({
      timestamp: point.timestamp,
      time: format(new Date(point.timestamp), 'HH:mm'),
      calls: point.callPremium,
      puts: point.putPremium,
      netFlow: point.netFlow
    }));
  }, [dataPoints]);

  // Format currency for tooltips
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2">
            {format(new Date(payload[0].payload.timestamp), 'MMM d, h:mm a')}
          </p>
          <div className="space-y-1">
            <p className="text-green-400 font-semibold">
              Calls: {formatCurrency(payload[0].value)}
            </p>
            <p className="text-red-400 font-semibold">
              Puts: {formatCurrency(payload[1].value)}
            </p>
            <p className="text-blue-400 font-semibold">
              Net: {formatCurrency(payload[2].value)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Show empty state if no data
  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <p className="text-slate-500 text-lg">No data available</p>
          <p className="text-slate-600 text-sm mt-2">
            {symbol} has no flow data for this period
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
          <XAxis
            dataKey="time"
            stroke="#64748b"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="line"
            />
          )}
          <Line
            type="monotone"
            dataKey="calls"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            name="Call Premium"
          />
          <Line
            type="monotone"
            dataKey="puts"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name="Put Premium"
          />
          <Line
            type="monotone"
            dataKey="netFlow"
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            name="Net Flow"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
