/**
 * Metrics service layer. All metric-related API calls go through here.
 * Components use this instead of calling lib/api directly.
 */

import * as api from "@/lib/api";
import { getDateRangeForPreset } from "@/lib/date";
import { generateSampleMetrics, getSampleMetricNames } from "@/lib/sampleMetrics";
import type { Metric, CreateMetricPayload, MetricsQueryParams } from "@/types/metric";

/** Minimum number of sample-named metrics in range to consider "already loaded". */
const SAMPLE_ALREADY_LOADED_THRESHOLD = 15;

export interface CreateSampleMetricsResult {
  created: number;
  skipped: boolean;
}

/** Fetch metrics with optional filters. */
export async function fetchMetrics(params?: MetricsQueryParams): Promise<Metric[]> {
  return api.fetchMetrics(params);
}

/** Create a single metric. */
export async function createMetric(payload: CreateMetricPayload): Promise<Metric> {
  return api.createMetric(payload);
}

/** Full 60-day sample has 5 metrics × 60 days = 300 points. */
const SAMPLE_FULL_COUNT = 300;

/**
 * Load the sample dataset (two 30-day windows for "Vs previous period" on 7d and 30d).
 * If the last 7 days already have sample data but the last 60 days do not have a full set,
 * clears sample data in the last 60 days and re-inserts so comparison works.
 */
export async function createSampleMetrics(): Promise<CreateSampleMetricsResult> {
  const sampleNames = new Set(getSampleMetricNames());

  const { startDate: last7Start, endDate: last7End } = getDateRangeForPreset(7);
  const existing7 = await api.fetchMetrics({ startDate: last7Start, endDate: last7End });
  const countLast7 = existing7.filter((m) => sampleNames.has(m.name)).length;

  if (countLast7 >= SAMPLE_ALREADY_LOADED_THRESHOLD) {
    const { startDate: last60Start, endDate: last60End } = getDateRangeForPreset(60);
    const existing60 = await api.fetchMetrics({ startDate: last60Start, endDate: last60End });
    const countLast60 = existing60.filter((m) => sampleNames.has(m.name)).length;

    if (countLast60 >= SAMPLE_FULL_COUNT) {
      return { created: 0, skipped: true };
    }

    await api.resetSampleMetrics(last60Start, last60End);
  }

  const payloads = generateSampleMetrics();
  for (const p of payloads) {
    await api.createMetric({
      name: p.name,
      value: p.value,
      timestamp: p.timestamp,
      variant: p.variant ?? null,
      country: p.country ?? null,
      device: p.device ?? null,
      segment: p.segment ?? null,
    });
  }
  return { created: payloads.length, skipped: false };
}
