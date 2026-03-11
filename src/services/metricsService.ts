/**
 * Metrics service layer. All metric-related API calls go through here.
 * Components use this instead of calling lib/api directly.
 */

import * as api from "@/lib/api";
import { getExactDaysRange } from "@/lib/date";
import { SAMPLE_DAYS } from "@/lib/constants";
import { generateSampleMetrics, NAMES_TO_FULLY_REMOVE_ON_SAMPLE_LOAD } from "@/lib/sampleMetrics";
import type {
  Metric,
  CreateMetricPayload,
  MetricsQueryParams,
} from "@/types/metric";

export interface CreateSampleMetricsResult {
  created: number;
  skipped: boolean;
}

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

/**
 * Load the sample dataset. Clears the DB first so old/unwanted metric names and units
 * don't persist in the UI dropdown:
 * 1. Fully remove unwanted metrics (e.g. Demo Bookings, staytime) from the entire DB.
 * 2. Delete sample + legacy names in the last 90 days.
 * 3. Insert 90 days of sample data with correct units.
 */
export async function createSampleMetrics(): Promise<CreateSampleMetricsResult> {
  const { startDate: rangeStart, endDate: rangeEnd } = getExactDaysRange(SAMPLE_DAYS);

  // Remove unwanted metrics entirely so they disappear from the metric names dropdown
  await Promise.all(
    NAMES_TO_FULLY_REMOVE_ON_SAMPLE_LOAD.map((name) => api.deleteMetricByName(name))
  );

  await api.resetSampleMetrics(rangeStart, rangeEnd);

  const payloads = generateSampleMetrics();
  const { count } = await api.createMetricsBatch(
    payloads.map((p) => ({
      name: p.name,
      value: p.value,
      timestamp: p.timestamp,
      unit: p.unit ?? "Count",
      variant: p.variant ?? null,
      country: p.country ?? null,
      device: p.device ?? null,
      segment: p.segment ?? null,
    }))
  );
  return { created: count, skipped: false };
}
