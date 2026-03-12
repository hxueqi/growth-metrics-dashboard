/**
 * Metrics service layer. All metric-related API calls go through here.
 * Components use this instead of calling lib/api directly.
 */

import * as api from "@/lib/api";
import type {
  Metric,
  CreateMetricPayload,
  MetricsQueryParams,
} from "@/types/metric";

/** Fetch distinct metric names (for selector and form suggestions). */
export async function fetchMetricNames(): Promise<string[]> {
  return api.fetchMetricNames();
}

/** Fetch distinct metric names with unit (for selector with unit display). */
export async function fetchMetricNamesWithUnits(): Promise<{ name: string; unit: string }[]> {
  return api.fetchMetricNamesWithUnits();
}

/** Fetch metrics with optional filters. */
export async function fetchMetrics(params?: MetricsQueryParams): Promise<Metric[]> {
  return api.fetchMetrics(params);
}

/** Create a single metric. */
export async function createMetric(payload: CreateMetricPayload): Promise<Metric> {
  return api.createMetric(payload);
}

/** Delete all data points for a metric by name. */
export async function deleteMetricByName(name: string): Promise<{ deleted: number }> {
  return api.deleteMetricByName(name);
}
