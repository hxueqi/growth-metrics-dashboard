/**
 * Date utilities for the dashboard. All functions are pure.
 */

import { DEFAULT_DATE_RANGE_DAYS } from "./constants";

/** Shape used by the date range filter (datetime-local input format). */
export interface DateRangeInput {
  startDate: string;
  endDate: string;
}

/** Preset time range keys for the analytics selector. */
export type TimeRangePreset = "7d" | "30d" | "90d" | "custom";

export interface TimeRangePresetOption {
  value: TimeRangePreset;
  label: string;
  days: number | null; // null = custom
}

export const TIME_RANGE_PRESETS: TimeRangePresetOption[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "custom", label: "Custom range", days: null },
];

/** MVP: presets only (no custom). */
export const TIME_RANGE_PRESETS_MVP = TIME_RANGE_PRESETS.filter((p) => p.value !== "custom");

/**
 * Default date range: from N days ago to now.
 * Values are in datetime-local format (YYYY-MM-DDTHH:mm).
 */
export function getDefaultDateRange(): DateRangeInput {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - DEFAULT_DATE_RANGE_DAYS);
  return {
    startDate: toDateTimeLocal(start),
    endDate: toDateTimeLocal(end),
  };
}

/**
 * Get start and end dates for a preset (e.g. last 7 days).
 * Returns ISO strings for API calls.
 */
export function getDateRangeForPreset(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

/**
 * Get the "previous period" range (same length as current, ending just before current start).
 * Used for trend and % change vs previous period.
 */
export function getPreviousPeriodRange(
  currentStartISO: string,
  currentEndISO: string
): { startDate: string; endDate: string } {
  const start = new Date(currentStartISO);
  const end = new Date(currentEndISO);
  const lengthMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - lengthMs);
  return {
    startDate: prevStart.toISOString(),
    endDate: prevEnd.toISOString(),
  };
}

/**
 * Convert a Date to datetime-local input value (YYYY-MM-DDTHH:mm).
 */
export function toDateTimeLocal(d: Date): string {
  return d.toISOString().slice(0, 16);
}

/**
 * Return true if the string parses as a valid date (for API validation).
 */
export function isValidDateString(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}
