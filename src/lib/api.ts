/**
 * Client-side API functions for metrics. All return typed data.
 */

import type { Metric, CreateMetricPayload, MetricsQueryParams } from "@/types/metric";

function getBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/**
 * Fetch metrics with optional filters. Returns metrics sorted by timestamp (asc).
 */
export async function fetchMetrics(params?: MetricsQueryParams): Promise<Metric[]> {
  const url = new URL("/api/metrics", getBaseUrl());
  if (params?.name) url.searchParams.set("name", params.name);
  if (params?.startDate) url.searchParams.set("startDate", params.startDate);
  if (params?.endDate) url.searchParams.set("endDate", params.endDate);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch metrics");
  const data = await res.json();
  return data as Metric[];
}

/**
 * Create a single metric. Returns the created metric.
 */
export async function createMetric(payload: CreateMetricPayload): Promise<Metric> {
  const res = await fetch("/api/metrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = typeof data?.error === "string" ? data.error : "Failed to create metric";
    throw new Error(message);
  }
  const data = await res.json();
  return data as Metric;
}

/**
 * Delete sample-named metrics in the given date range (ISO strings).
 * Used before re-inserting sample data so "Vs previous period" has data in both windows.
 */
export async function resetSampleMetrics(startDate: string, endDate: string): Promise<{ deleted: number }> {
  const res = await fetch("/api/metrics/reset-sample", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startDate, endDate }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = typeof data?.error === "string" ? data.error : "Failed to reset sample metrics";
    throw new Error(message);
  }
  const data = await res.json();
  return data as { deleted: number };
}
