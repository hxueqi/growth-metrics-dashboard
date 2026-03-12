/**
 * Shared types for metrics across the app and API.
 * Keep all metric-related shapes here for a single source of truth.
 */

/** Metric as returned from the API (e.g. GET /api/metrics). */
export interface Metric {
  id: string;
  name: string;
  value: number;
  timestamp: string;
  unit?: string;
  createdAt: string;
}

/** Payload for creating a metric (POST /api/metrics). */
export interface CreateMetricPayload {
  name: string;
  value: number;
  timestamp: string;
  unit?: string;
}

/** Raw metric option for selector (name + unit). */
export interface RawMetricOption {
  name: string;
  unit: string;
}

export const METRIC_UNIT_OPTIONS = ["Count", "Percentage", "Currency", "Seconds"] as const;

/** Query parameters for fetching metrics (GET /api/metrics). */
export interface MetricsQueryParams {
  /** Single name (legacy). Prefer `names` for multi-select. */
  name?: string;
  /** Filter by these metric names. Omit = all metrics. */
  names?: string[];
  /** When true, return no metrics (empty chart). */
  empty?: boolean;
  startDate?: string;
  endDate?: string;
}

/** Summary statistics computed from a list of metrics. */
export interface MetricSummaryStats {
  currentValue: number | null;
  average: number;
  min: number;
  max: number;
  /** Average in the previous period (same length as current). */
  previousPeriodAverage: number | null;
  /** Percent change: (current - previous) / previous * 100. Null if no previous data. */
  percentChange: number | null;
}

/** Summary for "All metrics" view: global stats and top performer. */
export interface AllMetricsSummaryStats {
  /** Sum of all values in the current period (total events). */
  totalEvents: number;
  /** Mean of all values in the current period. */
  globalAverage: number;
  /** (totalCurrent - totalPrevious) / totalPrevious * 100. Null if no previous data. */
  globalPercentChange: number | null;
  /** Metric name with highest % growth vs previous period, and that percent. */
  topGainer: { name: string; percentChange: number } | null;
}
