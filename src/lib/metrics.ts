/**
 * Pure functions for metric data: computations and transformations.
 * No I/O; easy to test and reuse.
 */

import type { Metric, MetricSummaryStats, AllMetricsSummaryStats } from "@/types/metric";

/**
 * Compute summary statistics in a single pass.
 * "Current" = value at the latest timestamp.
 * If previousPeriodMetrics is provided, computes previousPeriodAverage and percentChange.
 */
export function computeSummaryStats(
  metrics: Metric[],
  previousPeriodMetrics?: Metric[]
): MetricSummaryStats {
  if (metrics.length === 0) {
    const prevAvg =
      previousPeriodMetrics && previousPeriodMetrics.length > 0
        ? previousPeriodMetrics.reduce((s, m) => s + m.value, 0) / previousPeriodMetrics.length
        : null;
    return {
      currentValue: null,
      average: 0,
      min: 0,
      max: 0,
      previousPeriodAverage: prevAvg,
      percentChange: null,
    };
  }

  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let latestTime = 0;
  let currentValue: number | null = null;

  for (const m of metrics) {
    const v = m.value;
    const t = new Date(m.timestamp).getTime();

    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
    if (t >= latestTime) {
      latestTime = t;
      currentValue = v;
    }
  }

  const average = sum / metrics.length;
  let previousPeriodAverage: number | null = null;
  let percentChange: number | null = null;

  if (
    previousPeriodMetrics &&
    previousPeriodMetrics.length > 0
  ) {
    const prevSum = previousPeriodMetrics.reduce((s, m) => s + m.value, 0);
    previousPeriodAverage = prevSum / previousPeriodMetrics.length;
    if (previousPeriodAverage !== 0) {
      percentChange =
        ((average - previousPeriodAverage) / previousPeriodAverage) * 100;
    }
  }

  return {
    currentValue,
    average,
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
    previousPeriodAverage,
    percentChange,
  };
}

/**
 * Get unique metric names from a list, sorted alphabetically.
 */
export function getUniqueMetricNames(metrics: Metric[]): string[] {
  return [...new Set(metrics.map((m) => m.name))].sort((a, b) => a.localeCompare(b));
}

/**
 * Get unique variants from a list (excluding null/empty), sorted.
 */
export function getUniqueVariants(metrics: Metric[]): string[] {
  return [...new Set(metrics.map((m) => m.variant).filter(Boolean) as string[])].sort((a, b) =>
    a.localeCompare(b)
  );
}

/**
 * Sum of values for metrics matching a given name.
 */
function sumByMetricName(metrics: Metric[], name: string): number {
  return metrics
    .filter((m) => m.name === name)
    .reduce((s, m) => s + m.value, 0);
}

/**
 * Compute summary for "All metrics" view: global average, global % change (current vs previous
 * total), and the metric with the highest percentage growth (top gainer).
 */
export function computeAllMetricsSummary(
  metrics: Metric[],
  previousPeriodMetrics: Metric[] = []
): AllMetricsSummaryStats {
  const totalCurrent = metrics.reduce((s, m) => s + m.value, 0);
  const totalPrevious = previousPeriodMetrics.reduce((s, m) => s + m.value, 0);
  const globalAverage = metrics.length > 0 ? totalCurrent / metrics.length : 0;
  const globalPercentChange =
    totalPrevious !== 0 ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : null;

  const names = getUniqueMetricNames(metrics);
  let topGainer: { name: string; percentChange: number } | null = null;

  for (const name of names) {
    const curSum = sumByMetricName(metrics, name);
    const prevSum = sumByMetricName(previousPeriodMetrics, name);
    if (prevSum === 0) continue;
    const pct = ((curSum - prevSum) / prevSum) * 100;
    if (topGainer === null || pct > topGainer.percentChange) {
      topGainer = { name, percentChange: pct };
    }
  }

  return {
    totalEvents: totalCurrent,
    globalAverage,
    globalPercentChange,
    topGainer,
  };
}
