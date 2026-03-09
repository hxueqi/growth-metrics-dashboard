/**
 * Chart data transformations. Used by MetricsChart and reusable for other analytics views.
 * Pure functions: metrics in -> series + series names out.
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

/** Build series: one row per timestamp, one column per metric name. Multiple points at same (time, name) are averaged. */
function buildSeriesByMetricName(metrics: Metric[]): ChartSeriesResult {
  const rowSums = new Map<string, Map<string, { sum: number; count: number }>>();
  for (const m of metrics) {
    const key = new Date(m.timestamp).toISOString();
    let row = rowSums.get(key);
    if (!row) {
      row = new Map();
      rowSums.set(key, row);
    }
    const entry = row.get(m.name);
    if (!entry) {
      row.set(m.name, { sum: m.value, count: 1 });
    } else {
      entry.sum += m.value;
      entry.count += 1;
    }
  }
  const series: Record<string, string | number>[] = [];
  for (const [timeKey, nameMap] of rowSums.entries()) {
    const row: Record<string, string | number> = { time: timeKey };
    for (const [name, { sum, count }] of nameMap.entries()) {
      row[name] = count > 0 ? sum / count : 0;
    }
    series.push(row);
  }
  series.sort(
    (a, b) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime()
  );
  const seriesNames = [...new Set(metrics.map((m) => m.name))];
  return { series, seriesNames };
}

/** Build series when breakdown is on: one row per timestamp, one column per segment value. */
function buildSeriesByBreakdown(
  metrics: Metric[],
  dimensionId: BreakdownDimensionId
): ChartSeriesResult {
  const rows = new Map<string, Record<string, string | number>>();
  const valueSet = new Set<string>();

  for (const m of metrics) {
    const key = new Date(m.timestamp).toISOString();
    const segmentValue = getBreakdownValue(m, dimensionId);
    valueSet.add(segmentValue);

    let row = rows.get(key);
    if (!row) {
      row = { time: key };
      rows.set(key, row);
    }
    const existing = row[segmentValue];
    if (existing !== undefined) {
      row[segmentValue] = (Number(existing) + m.value) / 2;
    } else {
      row[segmentValue] = m.value;
    }
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
