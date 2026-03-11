/**
 * Chart data transformation
 *
 * Responsibilities:
 * - group metrics by metric name
 * - bucket metrics by timestamp
 * - resolve duplicate timestamps
 * - convert raw metrics into chart series format
 *
 * Duplicate timestamp rule:
 * If multiple records exist for the same metric and timestamp,
 * the chart keeps the most recently created record (based on createdAt).
 * This prevents duplicate submissions from inflating the chart values.
 */

import type { Metric, BreakdownDimensionId } from "@/types/metric";
import { getBreakdownValue } from "@/lib/breakdown";

export interface ChartDataOptions {
  selectedName?: string;
  selectedVariant?: string;
  breakdownBy?: BreakdownDimensionId | null;
}

export interface ChartSeriesResult {
  series: Record<string, string | number>[];
  seriesNames: string[];
}

/** Filter metrics by optional name and variant. */
export function filterMetricsForChart(
  metrics: Metric[],
  options: Pick<ChartDataOptions, "selectedName" | "selectedVariant">
): Metric[] {
  let out = metrics;
  if (options.selectedName?.trim()) {
    out = out.filter((m) => m.name === options.selectedName);
    if (options.selectedVariant?.trim()) {
      out = out.filter((m) => m.variant === options.selectedVariant);
    }
  }
  return out;
}

/** Build series: one row per timestamp, one column per metric name. Multiple points at same (time, name) use the last value (by createdAt). */
function buildSeriesByMetricName(metrics: Metric[]): ChartSeriesResult {
  const byTime = new Map<string, Map<string, number>>();
  const sorted = [...metrics].sort((a, b) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tA - tB;
  });
  for (const m of sorted) {
    const key = new Date(m.timestamp).toISOString();
    let row = byTime.get(key);
    if (!row) {
      row = new Map();
      byTime.set(key, row);
    }
    row.set(m.name, m.value);
  }
  const seriesNames = [...new Set(metrics.map((m) => m.name))];
  const series: Record<string, string | number>[] = [];
  for (const [timeKey, nameMap] of byTime.entries()) {
    const row: Record<string, string | number> = { time: timeKey };
    for (const [name, value] of nameMap.entries()) {
      row[name] = value;
    }
    for (const name of seriesNames) {
      if (row[name] === undefined || row[name] === null) row[name] = 0;
    }
    series.push(row);
  }
  series.sort(
    (a, b) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime()
  );
  return { series, seriesNames };
}

/** Build series when breakdown is on: one row per timestamp, one column per segment value. Duplicate (time, segment) use the last value (by createdAt). */
function buildSeriesByBreakdown(
  metrics: Metric[],
  dimensionId: BreakdownDimensionId
): ChartSeriesResult {
  const rows = new Map<string, Record<string, string | number>>();
  const valueSet = new Set<string>();
  const sorted = [...metrics].sort((a, b) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tA - tB;
  });

  for (const m of sorted) {
    const key = new Date(m.timestamp).toISOString();
    const segmentValue = getBreakdownValue(m, dimensionId);
    valueSet.add(segmentValue);

    let row = rows.get(key);
    if (!row) {
      row = { time: key };
      rows.set(key, row);
    }
    row[segmentValue] = m.value;
  }

  const seriesNames = [...valueSet].filter((n) => n !== "—").sort((a, b) => a.localeCompare(b));
  if (valueSet.has("—")) seriesNames.push("—");

  const series = Array.from(rows.values()).sort(
    (a, b) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime()
  );
  return { series, seriesNames };
}

/**
 * Build chart series and series names from metrics and options.
 * Reusable for any view that needs time-series line chart data.
 */
export function buildSeriesFromMetrics(
  metrics: Metric[],
  options: ChartDataOptions = {}
): ChartSeriesResult {
  const filtered = filterMetricsForChart(metrics, options);
  if (options.breakdownBy?.trim()) {
    return buildSeriesByBreakdown(filtered, options.breakdownBy as BreakdownDimensionId);
  }
  return buildSeriesByMetricName(filtered);
}
