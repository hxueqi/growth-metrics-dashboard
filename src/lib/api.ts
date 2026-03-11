/**
 * Client-side API functions for metrics. All return typed data.
 */

import type {
  Metric,
  CreateMetricPayload,
  MetricsQueryParams,
  RawMetricOption,
} from "@/types/metric";

function getBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/**
 * Fetch distinct metric names with unit (sorted A–Z).
 */
export async function fetchMetricNamesWithUnits(): Promise<RawMetricOption[]> {
  const res = await fetch(`${getBaseUrl()}/api/metrics/names`);
  if (!res.ok) throw new Error("Failed to fetch metric names");
  const data = await res.json();
  if (Array.isArray(data?.metrics)) return data.metrics;
  return Array.isArray(data?.names) ? data.names.map((name: string) => ({ name, unit: "Count" })) : [];
}

export async function fetchMetricNames(): Promise<string[]> {
  const metrics = await fetchMetricNamesWithUnits();
  return metrics.map((m) => m.name);
}

/**
 * Fetch metrics with optional filters. Returns metrics sorted by timestamp (asc).
 */
export async function fetchMetrics(params?: MetricsQueryParams): Promise<Metric[]> {
  const url = new URL("/api/metrics", getBaseUrl());
  if (params?.empty) {
    url.searchParams.set("empty", "1");
  } else if (params?.names?.length) {
    params.names.forEach((n) => url.searchParams.append("name", n));
  } else if (params?.name) {
    url.searchParams.set("name", params.name);
  }
  if (params?.startDate) url.searchParams.set("startDate", params.startDate);
  if (params?.endDate) url.searchParams.set("endDate", params.endDate);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch metrics");
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((m: Record<string, unknown>) => ({
    ...m,
    value: typeof m.value === "number" && Number.isFinite(m.value) ? m.value : 0,
  })) as Metric[];
}

/**
 * Delete all data points for a metric by name. Returns the number of records deleted.
 */
export async function deleteMetricByName(name: string): Promise<{ deleted: number }> {
  const res = await fetch(
    `${getBaseUrl()}/api/metrics?${new URLSearchParams({ name: name.trim() })}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = typeof data?.error === "string" ? data.error : "Failed to delete metric";
    throw new Error(message);
  }
  return res.json();
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
 * Load sample dataset via server-only route. Use this in production so no secret is sent from the client.
 * Server checks RESET_SAMPLE_SECRET and runs the full flow (clear + insert). Returns { created: number }.
 */
export async function loadSample(): Promise<{ created: number }> {
  const res = await fetch(`${getBaseUrl()}/api/load-sample`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = typeof data?.error === "string" ? data.error : "Failed to load sample dataset";
    throw new Error(message);
  }
  const data = await res.json();
  return data as { created: number };
}

/**
 * Delete sample-named metrics in the given date range (ISO strings).
 * Used before re-inserting sample data so "Vs previous period" has data in both windows.
 * @deprecated Prefer loadSample() for production (no client secret). Still used internally by reset-sample.
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

/**
 * Create multiple metrics in one request (batch insert).
 * Body: { metrics: CreateMetricPayload[] }. Returns { count: number }.
 */
export async function createMetricsBatch(
  metrics: CreateMetricPayload[]
): Promise<{ count: number }> {
  const res = await fetch(`${getBaseUrl()}/api/metrics/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metrics }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = typeof data?.error === "string" ? data.error : "Failed to create metrics";
    throw new Error(message);
  }
  const data = await res.json();
  return data as { count: number };
}
