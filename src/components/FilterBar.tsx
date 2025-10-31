import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterBarProps {
  ticker: string;
  setTicker: (value: string) => void;
  minPremium: string;
  setMinPremium: (value: string) => void;
  timeWindow: string;
  setTimeWindow: (value: string) => void;
}

export const FilterBar = ({
  ticker,
  setTicker,
  minPremium,
  setMinPremium,
  timeWindow,
  setTimeWindow,
}: FilterBarProps) => {
  return (
    <div className="bg-card border-b border-border px-6 py-4 sticky top-0 z-10 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground whitespace-nowrap">Ticker:</label>
          <Input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="e.g., QQQ"
            className="w-32"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground whitespace-nowrap">Min Premium:</label>
          <Input
            type="number"
            value={minPremium}
            onChange={(e) => setMinPremium(e.target.value)}
            placeholder="50000"
            className="w-32"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground whitespace-nowrap">Time Window:</label>
          <Select value={timeWindow} onValueChange={setTimeWindow}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="4h">4 Hours</SelectItem>
              <SelectItem value="1d">1 Day</SelectItem>
              <SelectItem value="5d">5 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="default" className="ml-auto">
          Apply Filters
        </Button>
      </div>
    </div>
  );
};
