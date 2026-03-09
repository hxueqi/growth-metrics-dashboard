/**
 * Application constants. Use UPPER_SNAKE_CASE for clarity.
 */

/** How often to refetch metrics (ms). */
export const REFRESH_INTERVAL_MS = 5000;

/** Metric names for acquisition & activation (selector when empty, record form). */
export const EXAMPLE_METRIC_NAMES = [
  "Website Visits",
  "Signups",
  "Activated Users",
  "Demo Bookings",
  "Trial Conversions",
] as const;

export type ExampleMetricName = (typeof EXAMPLE_METRIC_NAMES)[number];

/** Names used by the sample dataset (must match EXAMPLE_METRIC_NAMES for consistency). */
export const SAMPLE_METRIC_NAMES: string[] = [...EXAMPLE_METRIC_NAMES];

/** Default number of days for the initial date range. */
export const DEFAULT_DATE_RANGE_DAYS = 7;

/** Chart line colors (Factorial-style: teal, lavender, soft orange, + extras). */
export const CHART_COLORS = [
  "#5EC4B2",
  "#B1A0E9",
  "#F7D076",
  "#EE2853",
  "#6B7280",
] as const;
