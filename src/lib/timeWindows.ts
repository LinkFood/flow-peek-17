export const TIME_WINDOWS: Record<
  string,
  { label: string; hours: number; lookbackMinutes: number }
> = {
  "1h": { label: "1 Hour", hours: 1, lookbackMinutes: 60 },
  "4h": { label: "4 Hours", hours: 4, lookbackMinutes: 240 },
  "1d": { label: "1 Day", hours: 24, lookbackMinutes: 1440 },
  "5d": { label: "5 Days", hours: 120, lookbackMinutes: 7200 },
  "1w": { label: "1 Week", hours: 168, lookbackMinutes: 10080 },
};

export const DEFAULT_TIME_WINDOW = "1d";

export const getTimeWindowHours = (key: string) =>
  TIME_WINDOWS[key]?.hours ?? TIME_WINDOWS[DEFAULT_TIME_WINDOW].hours;

export const getLookbackMinutes = (key: string) =>
  TIME_WINDOWS[key]?.lookbackMinutes ?? TIME_WINDOWS[DEFAULT_TIME_WINDOW].lookbackMinutes;

export const getTimeWindowLabel = (key: string) =>
  TIME_WINDOWS[key]?.label ?? TIME_WINDOWS[DEFAULT_TIME_WINDOW].label;
