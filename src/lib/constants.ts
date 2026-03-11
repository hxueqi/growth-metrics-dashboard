/**
 * Application constants. Use UPPER_SNAKE_CASE for clarity.
 */

/** Max number of metrics returned by GET /api/metrics (and getMetrics). */
export const API_METRICS_LIMIT = 5000;

/** Max number of metrics accepted in a single POST /api/metrics/batch request. */
export const BATCH_METRICS_LIMIT = 5000;

/** Number of days for the sample dataset (Load sample dataset). */
export const SAMPLE_DAYS = 90;

/** Max allowed value for a metric (POST /api/metrics and Add metric form). */
export const VALUE_MAX = 1_000_000_000;

/** How often to refetch metrics (ms). */
export const REFRESH_INTERVAL_MS = 5000;

/** Names used by the "Load sample dataset" feature only. Metric names are otherwise dynamic from the DB. */
export const SAMPLE_METRIC_NAMES: string[] = [
  "Website Visits",
  "Signups",
  "Activated Users",
  "Revenue",
  "Ad Spend",
  "Conversion Rate",
  "Churn Rate",
  "Page Load Time",
];

/** Default number of days for the initial date range. */
export const DEFAULT_DATE_RANGE_DAYS = 7;

/** Chart line colors: one per metric for clear distinction (Factorial-style + extras). */
export const CHART_COLORS = [
  "#5EC4B2", // teal
  "#B1A0E9", // lavender
  "#F7D076", // soft orange
  "#EE2853", // accent red
  "#6B7280", // slate
  "#34D399", // emerald
  "#60A5FA", // blue
  "#F472B6", // pink
  "#A78BFA", // violet
  "#FBBF24", // amber
] as const;
