import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface DateModePickerProps {
  isLive: boolean;
  selectedDate: Date;
  onModeChange: (isLive: boolean) => void;
  onDateChange: (date: Date) => void;
}

export function DateModePicker({
  isLive,
  selectedDate,
  onModeChange,
  onDateChange
}: DateModePickerProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Generate last 7 trading days (excluding weekends)
  const availableDates: Date[] = [];
  let daysBack = 0;
  while (availableDates.length < 7) {
    const date = subDays(new Date(), daysBack);
    const dayOfWeek = date.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      availableDates.push(date);
    }
    daysBack++;
  }

  const handleDateSelect = (date: Date) => {
    onDateChange(date);
    onModeChange(false); // Switch to historical mode
    setShowDatePicker(false);
  };

  const handleLiveMode = () => {
    onModeChange(true);
    onDateChange(new Date()); // Reset to today
    setShowDatePicker(false); // Close date picker
  };

  const handleHistoricalMode = () => {
    onModeChange(false); // Switch to historical mode
    setShowDatePicker(true); // Open date picker
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-2 mb-3">
      <div className="flex items-center justify-between">
        {/* Mode Toggle - COMPACT */}
        <div className="flex gap-2">
          <button
            onClick={handleLiveMode}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
              isLive
                ? 'bg-red-500/20 text-red-400 border border-red-500'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            🔴 LIVE
          </button>
          <button
            onClick={handleHistoricalMode}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all flex items-center gap-1 ${
              !isLive
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            <Calendar className="w-3 h-3" />
            HISTORICAL
          </button>
        </div>

        {/* Current Date Display - COMPACT */}
        <div className="text-slate-300">
          {isLive ? (
            <span className="text-sm font-mono">
              Today • {format(new Date(), 'MMM d')}
            </span>
          ) : (
            <span className="text-sm font-mono text-blue-400">
              {format(selectedDate, 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>

      {/* Date Picker Dropdown - COMPACT */}
      {showDatePicker && !isLive && (
        <div className="mt-2 p-2 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-xs font-semibold text-slate-400 mb-2">
            Select Day
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {availableDates.map((date, index) => {
              const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

              return (
                <button
                  key={index}
                  onClick={() => handleDateSelect(date)}
                  disabled={isToday && isLive}
                  className={`p-1 rounded transition-all ${
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <div className="text-[10px] text-slate-400">
                    {format(date, 'EEE')}
                  </div>
                  <div className="text-sm font-bold">
                    {format(date, 'd')}
                  </div>
                  <div className="text-[10px]">
                    {format(date, 'MMM')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
