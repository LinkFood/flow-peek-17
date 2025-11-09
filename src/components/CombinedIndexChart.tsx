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

interface CombinedIndexChartProps {
  spyData: TimelineDataPoint[];
  qqqData: TimelineDataPoint[];
  height?: number;
}

export function CombinedIndexChart({
  spyData,
  qqqData,
  height = 400
}: CombinedIndexChartProps) {
  // Merge SPY and QQQ data by timestamp
  const chartData = useMemo(() => {
    const timeMap = new Map<number, any>();

    // Add SPY data
    spyData.forEach(point => {
      timeMap.set(point.timestamp, {
        timestamp: point.timestamp,
        time: format(new Date(point.timestamp), 'HH:mm'),
        spyCalls: point.callPremium,
        spyPuts: point.putPremium,
        qqqCalls: 0,
        qqqPuts: 0
      });
    });

    // Add QQQ data
    qqqData.forEach(point => {
      const existing = timeMap.get(point.timestamp) || {
        timestamp: point.timestamp,
        time: format(new Date(point.timestamp), 'HH:mm'),
        spyCalls: 0,
        spyPuts: 0
      };
      timeMap.set(point.timestamp, {
        ...existing,
        qqqCalls: point.callPremium,
        qqqPuts: point.putPremium
      });
    });

    return Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [spyData, qqqData]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-sm mb-2">
            {format(new Date(payload[0].payload.timestamp), 'MMM d, h:mm a')}
          </p>
          <div className="space-y-1">
            <p className="text-green-500 font-semibold">
              SPY Calls: {formatCurrency(payload[0].payload.spyCalls)}
            </p>
            <p className="text-red-500 font-semibold">
              SPY Puts: {formatCurrency(payload[0].payload.spyPuts)}
            </p>
            <p className="text-emerald-400 font-semibold">
              QQQ Calls: {formatCurrency(payload[0].payload.qqqCalls)}
            </p>
            <p className="text-rose-400 font-semibold">
              QQQ Puts: {formatCurrency(payload[0].payload.qqqPuts)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <p className="text-slate-500 text-lg">No data available</p>
          <p className="text-slate-600 text-sm mt-2">
            SPY & QQQ have no flow data for this period
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
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="line"
          />
          {/* SPY lines (darker) */}
          <Line
            type="monotone"
            dataKey="spyCalls"
            stroke="#22c55e"
            strokeWidth={3}
            dot={false}
            name="SPY Calls"
          />
          <Line
            type="monotone"
            dataKey="spyPuts"
            stroke="#ef4444"
            strokeWidth={3}
            dot={false}
            name="SPY Puts"
          />
          {/* QQQ lines (lighter) */}
          <Line
            type="monotone"
            dataKey="qqqCalls"
            stroke="#86efac"
            strokeWidth={2}
            dot={false}
            name="QQQ Calls"
          />
          <Line
            type="monotone"
            dataKey="qqqPuts"
            stroke="#fca5a5"
            strokeWidth={2}
            dot={false}
            name="QQQ Puts"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
