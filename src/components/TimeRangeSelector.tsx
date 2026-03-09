"use client";

import {
  TIME_RANGE_PRESETS_MVP,
  getDateRangeForPreset,
  toDateTimeLocal,
  type TimeRangePreset,
  type DateRangeInput,
} from "@/lib/date";

export interface TimeRangeSelectorProps {
  preset: TimeRangePreset;
  dateRange: DateRangeInput;
  onPresetChange: (preset: TimeRangePreset) => void;
  onDateRangeChange: (range: DateRangeInput) => void;
}

export function TimeRangeSelector({
  preset,
  dateRange,
  onPresetChange,
  onDateRangeChange,
}: TimeRangeSelectorProps) {
  function handlePresetClick(option: (typeof TIME_RANGE_PRESETS_MVP)[number]) {
    onPresetChange(option.value);
    if (option.days != null) {
      const { startDate, endDate } = getDateRangeForPreset(option.days);
      onDateRangeChange({
        startDate: toDateTimeLocal(new Date(startDate)),
        endDate: toDateTimeLocal(new Date(endDate)),
      });
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-1.5">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Time range
      </span>
      <div className="flex flex-wrap gap-1.5">
        {TIME_RANGE_PRESETS_MVP.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handlePresetClick(option)}
            aria-pressed={preset === option.value}
            className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
              preset === option.value
                ? "border-factorial-accent bg-factorial-accent text-white dark:border-factorial-accent dark:bg-factorial-accent dark:text-white"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
