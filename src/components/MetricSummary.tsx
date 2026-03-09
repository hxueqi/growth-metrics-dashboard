"use client";

import type { Metric } from "@/types/metric";
import { computeSummaryStats, computeAllMetricsSummary } from "@/lib/metrics";
import {
  formatMetricValue,
  formatIntegerLocale,
  formatPercent,
  EMPTY_VALUE_LABEL,
} from "@/lib/format";
import { StatCard } from "./ui/StatCard";

export interface MetricsSummaryProps {
  /** Metrics for the current period (filtered by selected metric and date range). */
  metrics: Metric[];
  /** Metrics for the previous period. Used for trend. */
  previousPeriodMetrics?: Metric[];
  /** Context for what the summary refers to (e.g. metric name or "All metrics"). */
  contextLabel?: string;
  /** When true, do not render contextLabel (e.g. when parent shows it in the header). */
  hideContextLabel?: boolean;
  /** When true, show Global Average, Global % Change, and Top Gainer instead of single-metric cards. */
  allMetricsMode?: boolean;
}

export function MetricsSummary({
  metrics,
  previousPeriodMetrics = [],
  contextLabel,
  hideContextLabel = false,
  allMetricsMode = false,
}: MetricsSummaryProps) {
  const isEmpty = metrics.length === 0;

  if (allMetricsMode) {
    const stats = computeAllMetricsSummary(metrics, previousPeriodMetrics);
    const { totalEvents, globalPercentChange, topGainer } = stats;

    const totalEventsDisplay =
      isEmpty ? EMPTY_VALUE_LABEL : formatIntegerLocale(Math.round(totalEvents));

    const hasGlobalTrend = !isEmpty && globalPercentChange !== null;
    const globalTrendVariant =
      !hasGlobalTrend ? undefined : globalPercentChange >= 0 ? "positive" : "negative";
    const globalTrendDisplay = !hasGlobalTrend
      ? "Not available"
      : formatPercent(globalPercentChange!);
    const globalTrendValue = hasGlobalTrend ? (
      <span className="inline-flex tabular-nums items-center gap-1">
        <span aria-hidden="true">{globalPercentChange! >= 0 ? "↑" : "↓"}</span>
        {globalTrendDisplay}
      </span>
    ) : (
      globalTrendDisplay
    );

    const topPerformingValue =
      topGainer === null
        ? "Not available"
        : `${topGainer.name} ${formatPercent(topGainer.percentChange)}`;
    const topPerformingVariant =
      topGainer === null
        ? undefined
        : topGainer.percentChange >= 0
          ? "positive"
          : "negative";

    return (
      <div className="space-y-3">
        {!hideContextLabel && contextLabel !== undefined && contextLabel !== "" && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{contextLabel}</p>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="min-w-0 h-full">
            <StatCard label="Total Events" value={totalEventsDisplay} className="h-full" />
          </div>
          <div className="min-w-0 h-full">
            <StatCard
              label="GLOBAL % CHANGE"
              value={globalTrendValue}
              variant={globalTrendVariant}
              className="h-full"
            />
          </div>
          <div className="min-w-0 h-full">
            <StatCard
              label="TOP PERFORMING METRIC"
              value={topPerformingValue}
              variant={topPerformingVariant}
              className="h-full"
            />
          </div>
        </div>
      </div>
    );
  }

  const stats = computeSummaryStats(metrics, previousPeriodMetrics);
  const { currentValue, average, percentChange } = stats;

  const currentDisplay = isEmpty
    ? EMPTY_VALUE_LABEL
    : currentValue !== null
      ? formatMetricValue(currentValue)
      : EMPTY_VALUE_LABEL;
  const averageDisplay = isEmpty ? EMPTY_VALUE_LABEL : formatMetricValue(average);

  const hasTrend = !isEmpty && percentChange !== null;
  const trendVariant =
    !hasTrend ? undefined : percentChange >= 0 ? "positive" : "negative";
  const trendDisplay = !hasTrend ? "Not available" : formatPercent(percentChange!);
  const trendValue = hasTrend ? (
    <span className="inline-flex tabular-nums items-center gap-1">
      <span aria-hidden="true">{percentChange! >= 0 ? "↑" : "↓"}</span>
      {trendDisplay}
    </span>
  ) : (
    trendDisplay
  );

  return (
    <div className="space-y-3">
      {!hideContextLabel && contextLabel !== undefined && contextLabel !== "" && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{contextLabel}</p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="min-w-0 h-full">
          <StatCard label="Current" value={currentDisplay} className="h-full" />
        </div>
        <div className="min-w-0 h-full">
          <StatCard label="Average" value={averageDisplay} subLabel="Per day" className="h-full" />
        </div>
        <div className="min-w-0 h-full">
          <StatCard
            label="VS PREVIOUS PERIOD"
            value={trendValue}
            variant={trendVariant}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
