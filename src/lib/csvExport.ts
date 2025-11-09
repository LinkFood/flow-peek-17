import { format } from 'date-fns';
import type { TimelineDataPoint, StrikeConcentration } from './api';

/**
 * Convert timeline data to CSV and trigger download
 */
export function exportTimelineToCSV(
  symbol: string,
  dataPoints: TimelineDataPoint[],
  date?: Date
) {
  if (!dataPoints || dataPoints.length === 0) {
    alert('No data to export');
    return;
  }

  // CSV headers
  const headers = ['Timestamp', 'Time', 'Call Premium', 'Put Premium', 'Net Flow', 'Call Count', 'Put Count'];

  // Convert data to CSV rows
  const rows = dataPoints.map(point => [
    new Date(point.timestamp).toISOString(),
    format(new Date(point.timestamp), 'HH:mm:ss'),
    point.callPremium.toFixed(2),
    point.putPremium.toFixed(2),
    point.netFlow.toFixed(2),
    point.callCount,
    point.putCount
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const dateStr = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  link.setAttribute('href', url);
  link.setAttribute('download', `${symbol}_flow_${dateStr}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export strike concentration data to CSV
 */
export function exportStrikesToCSV(
  symbol: string,
  strikes: StrikeConcentration[]
) {
  if (!strikes || strikes.length === 0) {
    alert('No strike data to export');
    return;
  }

  // CSV headers
  const headers = ['Strike', 'Side', 'Expiry', 'DTE', 'Hit Count', 'Total Premium', 'Total Size', 'Flow Grade'];

  // Convert data to CSV rows
  const rows = strikes.map(strike => [
    strike.strike.toFixed(2),
    strike.side,
    strike.expiry,
    strike.dte,
    strike.hitCount,
    strike.totalPremium.toFixed(2),
    strike.totalSize,
    strike.flowGrade
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${symbol}_strikes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export multiple tickers timeline data to CSV
 */
export function exportMultiTickerToCSV(
  timelines: Record<string, { dataPoints: TimelineDataPoint[] }>,
  date?: Date
) {
  const tickers = Object.keys(timelines);

  if (tickers.length === 0) {
    alert('No data to export');
    return;
  }

  // Find all unique timestamps
  const timestamps = new Set<number>();
  tickers.forEach(ticker => {
    timelines[ticker].dataPoints.forEach(point => {
      timestamps.add(point.timestamp);
    });
  });

  const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

  // CSV headers
  const headers = ['Timestamp', 'Time'];
  tickers.forEach(ticker => {
    headers.push(`${ticker}_Calls`, `${ticker}_Puts`, `${ticker}_Net`);
  });

  // Build rows
  const rows = sortedTimestamps.map(timestamp => {
    const row = [
      new Date(timestamp).toISOString(),
      format(new Date(timestamp), 'HH:mm:ss')
    ];

    tickers.forEach(ticker => {
      const point = timelines[ticker].dataPoints.find(p => p.timestamp === timestamp);
      if (point) {
        row.push(
          point.callPremium.toFixed(2),
          point.putPremium.toFixed(2),
          point.netFlow.toFixed(2)
        );
      } else {
        row.push('0', '0', '0');
      }
    });

    return row;
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const dateStr = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  link.setAttribute('href', url);
  link.setAttribute('download', `multi_ticker_flow_${dateStr}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
