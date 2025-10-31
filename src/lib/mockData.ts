export interface OptionFlow {
  id: string;
  ts_utc: string;
  underlying: string;
  option_symbol: string;
  side: "CALL" | "PUT";
  action: "BUY" | "SELL";
  strike: number;
  expiry: string;
  premium: number;
  size: number;
}

export const mockFlowData: OptionFlow[] = [
  {
    id: "1",
    ts_utc: "2025-10-31T14:35:22Z",
    underlying: "QQQ",
    option_symbol: "QQQ251107C00490000",
    side: "CALL",
    action: "BUY",
    strike: 490,
    expiry: "2025-11-07",
    premium: 125000,
    size: 250,
  },
  {
    id: "2",
    ts_utc: "2025-10-31T14:33:15Z",
    underlying: "SPY",
    option_symbol: "SPY251031P00575000",
    side: "PUT",
    action: "BUY",
    strike: 575,
    expiry: "2025-10-31",
    premium: 87500,
    size: 175,
  },
  {
    id: "3",
    ts_utc: "2025-10-31T14:31:08Z",
    underlying: "TSLA",
    option_symbol: "TSLA251114C00250000",
    side: "CALL",
    action: "BUY",
    strike: 250,
    expiry: "2025-11-14",
    premium: 215000,
    size: 430,
  },
  {
    id: "4",
    ts_utc: "2025-10-31T14:28:45Z",
    underlying: "QQQ",
    option_symbol: "QQQ251121P00480000",
    side: "PUT",
    action: "BUY",
    strike: 480,
    expiry: "2025-11-21",
    premium: 92000,
    size: 184,
  },
  {
    id: "5",
    ts_utc: "2025-10-31T14:26:33Z",
    underlying: "NVDA",
    option_symbol: "NVDA251205C00145000",
    side: "CALL",
    action: "BUY",
    strike: 145,
    expiry: "2025-12-05",
    premium: 178000,
    size: 356,
  },
  {
    id: "6",
    ts_utc: "2025-10-31T14:24:12Z",
    underlying: "AAPL",
    option_symbol: "AAPL251107C00230000",
    side: "CALL",
    action: "BUY",
    strike: 230,
    expiry: "2025-11-07",
    premium: 142000,
    size: 284,
  },
  {
    id: "7",
    ts_utc: "2025-10-31T14:22:05Z",
    underlying: "SPY",
    option_symbol: "SPY251114P00570000",
    side: "PUT",
    action: "BUY",
    strike: 570,
    expiry: "2025-11-14",
    premium: 105000,
    size: 210,
  },
  {
    id: "8",
    ts_utc: "2025-10-31T14:19:48Z",
    underlying: "META",
    option_symbol: "META251128C00565000",
    side: "CALL",
    action: "BUY",
    strike: 565,
    expiry: "2025-11-28",
    premium: 198000,
    size: 396,
  },
];

export const formatPremium = (premium: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(premium);
};

export const formatTime = (utcTime: string): string => {
  return new Date(utcTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
