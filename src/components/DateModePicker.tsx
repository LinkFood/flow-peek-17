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
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={handleLiveMode}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              isLive
                ? 'bg-red-500/20 text-red-400 border-2 border-red-500'
                : 'bg-slate-800 text-slate-400 border-2 border-slate-700 hover:border-slate-600'
            }`}
          >
            🔴 LIVE
          </button>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              !isLive
                ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500'
                : 'bg-slate-800 text-slate-400 border-2 border-slate-700 hover:border-slate-600'
            }`}
          >
            <Calendar className="w-4 h-4" />
            HISTORICAL
          </button>
        </div>

        {/* Current Date Display */}
        <div className="text-slate-300">
          {isLive ? (
            <span className="text-lg font-mono">
              Today • {format(new Date(), 'MMM d, yyyy')}
            </span>
          ) : (
            <span className="text-lg font-mono text-blue-400">
              {format(selectedDate, 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>

      {/* Date Picker Dropdown */}
      {showDatePicker && !isLive && (
        <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">
            Select Trading Day
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {availableDates.map((date, index) => {
              const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

              return (
                <button
                  key={index}
                  onClick={() => handleDateSelect(date)}
                  disabled={isToday && isLive}
                  className={`p-3 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <div className="text-xs text-slate-400">
                    {format(date, 'EEE')}
                  </div>
                  <div className="text-lg font-bold">
                    {format(date, 'd')}
                  </div>
                  <div className="text-xs">
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
