/**
 * Reusable formatting utilities. Pure functions, no side effects.
 */

/**
 * Format an ISO date string for display in charts and tooltips.
 */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Time range preset for axis formatting (7d / 30d = date only; 90d = date + time). */
export type ChartTimeRangePreset = "7d" | "30d" | "90d";

/**
 * Format an ISO date string for the chart X-axis. For 7d and 30d, returns "MMM dd" (e.g. Mar 01);
 * for 90d or unknown, returns date and time.
 */
export function formatChartAxisLabel(iso: string, timeRange?: ChartTimeRangePreset): string {
  const d = new Date(iso);
  if (timeRange === "7d" || timeRange === "30d") {
    return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a numeric value to a fixed number of decimal places.
 */
export function formatMetricValue(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format an integer with locale grouping (e.g. 14321 → "14,321"), no decimal places.
 */
export function formatIntegerLocale(value: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

/**
 * Format a percentage with consistent "+" or "-" prefix and one decimal (e.g. +14.7%, -3.2%).
 */
export function formatPercent(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

/**
 * Placeholder when a value is missing (e.g. no data).
 */
export const EMPTY_VALUE_LABEL = "—";
