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

/**
 * Format a number for chart Y-axis ticks by unit.
 * Currency: €1,200; Percentage: 85%; Seconds: 45s; Count: compact (1.2k).
 */
export function formatChartYAxisValue(value: number, unit?: string): string {
  const u = (unit?.trim() || "Count").toLowerCase();
  if (u === "currency") {
    return `€${value >= 1000 ? (value / 1000).toFixed(1) + "k" : value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  if (u === "percentage") {
    return `${Number(value).toFixed(0)}%`;
  }
  if (u === "seconds") {
    return `${Number(value).toFixed(0)}s`;
  }
  // Count or unknown: compact notation for large numbers
  if (Math.abs(value) >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + "M";
  }
  if (Math.abs(value) >= 1_000) {
    return (value / 1_000).toFixed(1) + "k";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Format a value for chart tooltip with unit context.
 * Currency: €1,234.56; Percentage: 85.2%; Seconds: 45.3s; Count: 1,234.
 */
export function formatChartTooltipValue(value: number, unit?: string): string {
  const u = (unit?.trim() || "Count").toLowerCase();
  if (u === "currency") {
    return `€${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  if (u === "percentage") {
    return `${Number(value).toFixed(2)}%`;
  }
  if (u === "seconds") {
    return `${Number(value).toFixed(2)}s`;
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
