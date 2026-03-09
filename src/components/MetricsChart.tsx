"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Metric, BreakdownDimensionId } from "@/types/metric";
import { formatTimestamp, formatChartAxisLabel, type ChartTimeRangePreset } from "@/lib/format";
import { CHART_COLORS } from "@/lib/constants";
import { buildSeriesFromMetrics, type ChartDataOptions } from "@/lib/chartData";
import { cn } from "@/lib/utils";

const CHART_MARGIN = { top: 40, right: 24, left: 44, bottom: 24 };
const NARROW_MARGIN_LEFT = 8;
const NARROW_MARGIN_RIGHT = 8;
const NARROW_VIEWPORT_MAX_WIDTH = 400;
const AXIS_TICK_STYLE = { fontSize: 12, fill: "#64748b" }; // text-slate-500
const DEFAULT_EMPTY_PRIMARY = "No data for this range.";
const DEFAULT_EMPTY_SECONDARY = "Add a metric or load the sample dataset to see the chart.";

/** Optional empty state config when the chart has no series. */
export interface ChartEmptyStateConfig {
  primary: string;
  secondary: string;
  /** Primary CTA (e.g. Load sample data). */
  primaryAction?: { label: string; onClick: () => void; loading?: boolean };
  /** Secondary CTA (e.g. Record data point). */
  secondaryAction?: { label: string; onClick: () => void };
}

/** Props when passing raw metrics (chart builds series via chartData). */
export interface MetricsChartMetricsProps {
  metrics: Metric[];
  selectedName?: string;
  selectedVariant?: string;
  breakdownBy?: BreakdownDimensionId | null;
  /** Current time range preset for X-axis label formatting (7d/30d = "MMM dd" only). */
  timeRangePreset?: ChartTimeRangePreset;
  /** When true (e.g. "All metrics"), use a secondary Y-axis for smaller-scale series. */
  useDualYAxis?: boolean;
  /** Custom empty state when there is no data to plot. */
  emptyState?: ChartEmptyStateConfig;
  /** Optional class for the chart container (e.g. full-screen height). */
  containerClassName?: string;
  /** Pre-built data not used. */
  series?: never;
  seriesNames?: never;
}

/** Props when passing pre-built series (reusable for any source). */
export interface MetricsChartSeriesProps {
  metrics?: never;
  selectedName?: never;
  selectedVariant?: never;
  breakdownBy?: never;
  timeRangePreset?: ChartTimeRangePreset;
  useDualYAxis?: boolean;
  emptyState?: ChartEmptyStateConfig;
  containerClassName?: string;
  series: Record<string, string | number>[];
  seriesNames: string[];
}

export type MetricsChartProps = MetricsChartMetricsProps | MetricsChartSeriesProps;

function isSeriesProps(props: MetricsChartProps): props is MetricsChartSeriesProps {
  return "series" in props && Array.isArray(props.series);
}

/**
 * Reusable line chart for time-series metrics. Accepts either metrics + filter options
 * (series built via lib/chartData) or pre-built series + seriesNames for full reuse.
 */

export function MetricsChart(props: MetricsChartProps) {
  const { series, seriesNames } = useMemo(() => {
    if (isSeriesProps(props)) {
      return { series: props.series, seriesNames: props.seriesNames };
    }
    return buildSeriesFromMetrics(props.metrics, {
      selectedName: props.selectedName,
      selectedVariant: props.selectedVariant,
      breakdownBy: props.breakdownBy,
    });
  }, [props]);

  const timeRangePreset = "timeRangePreset" in props ? props.timeRangePreset : undefined;
  const xAxisFormatter = useCallback(
    (value: string) => formatChartAxisLabel(value, timeRangePreset),
    [timeRangePreset]
  );

  const emptyState = "emptyState" in props ? props.emptyState : undefined;
  const useDualYAxis = "useDualYAxis" in props ? props.useDualYAxis : false;
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(() => new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [hideYAxisLabels, setHideYAxisLabels] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0]?.contentRect ?? { width: 0 };
      setHideYAxisLabels(width > 0 && width < NARROW_VIEWPORT_MAX_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** When useDualYAxis and multiple series, put largest-scale series on left axis, rest on right. */
  const { leftSeriesNames, rightSeriesNames } = useMemo(() => {
    if (!useDualYAxis || seriesNames.length <= 1 || series.length === 0) {
      return { leftSeriesNames: seriesNames, rightSeriesNames: [] as string[] };
    }
    const maxBySeries = new Map<string, number>();
    for (const name of seriesNames) {
      let max = -Infinity;
      for (const row of series) {
        const v = row[name];
        if (typeof v === "number" && v > max) max = v;
      }
      maxBySeries.set(name, max === -Infinity ? 0 : max);
    }
    const sorted = [...seriesNames].sort(
      (a, b) => (maxBySeries.get(b) ?? 0) - (maxBySeries.get(a) ?? 0)
    );
    const left = sorted.slice(0, 1);
    const right = sorted.slice(1);
    return { leftSeriesNames: left, rightSeriesNames: right };
  }, [useDualYAxis, seriesNames, series]);

  const toggleSeries = useCallback((dataKey: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) next.delete(dataKey);
      else next.add(dataKey);
      return next;
    });
  }, []);

  const chartAriaLabel =
    isSeriesProps(props)
      ? "Metrics over time"
      : ["Metrics over time", props.selectedName].filter(Boolean).join(", ");

  if (series.length === 0) {
    const primary = emptyState?.primary ?? DEFAULT_EMPTY_PRIMARY;
    const secondary = emptyState?.secondary ?? DEFAULT_EMPTY_SECONDARY;
    const hasActions = emptyState?.primaryAction ?? emptyState?.secondaryAction;

    return (
      <div
        role="img"
        aria-label={chartAriaLabel}
        className="flex min-h-[200px] max-h-[500px] flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-10 text-center dark:border-gray-600 dark:bg-gray-800/40 aspect-[16/7]"
      >
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {primary}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            {secondary}
          </p>
        </div>
        {hasActions && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {emptyState?.primaryAction && (
              <button
                type="button"
                onClick={emptyState.primaryAction.onClick}
                disabled={emptyState.primaryAction.loading}
                className="rounded-lg bg-factorial-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-factorial-accent-hover focus:outline-none focus:ring-2 focus:ring-factorial-accent focus:ring-offset-2 disabled:opacity-50 dark:bg-factorial-accent dark:hover:bg-factorial-accent-hover"
              >
                {emptyState.primaryAction.loading ? "Loading…" : emptyState.primaryAction.label}
              </button>
            )}
            {emptyState?.secondaryAction && (
              <button
                type="button"
                onClick={emptyState.secondaryAction.onClick}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {emptyState.secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const containerClass =
    "containerClassName" in props && props.containerClassName
      ? cn("w-full min-h-0", props.containerClassName)
      : "w-full min-h-[200px] max-h-[400px] aspect-[16/7]";

  const chartMargin = {
    ...CHART_MARGIN,
    left: hideYAxisLabels ? NARROW_MARGIN_LEFT : CHART_MARGIN.left,
    right: rightSeriesNames.length > 0
      ? hideYAxisLabels ? NARROW_MARGIN_RIGHT : 48
      : hideYAxisLabels ? NARROW_MARGIN_RIGHT : CHART_MARGIN.right,
  };

  return (
    <div ref={containerRef} className={containerClass} role="img" aria-label={chartAriaLabel}>
      {/* ResponsiveContainer fills this div (100% width/height) so the chart is responsive */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={series}
          margin={chartMargin}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E2E8F0"
            strokeOpacity={0.5}
            vertical={false}
            className="dark:stroke-slate-600"
          />
          <XAxis
            dataKey="time"
            tickFormatter={xAxisFormatter}
            tick={AXIS_TICK_STYLE}
            axisLine={{ stroke: "#D1D5DB" }}
            tickLine={false}
            minTickGap={50}
          />
          <YAxis
            yAxisId="left"
            tick={!hideYAxisLabels ? AXIS_TICK_STYLE : false}
            axisLine={false}
            tickLine={false}
            tickCount={5}
            width={hideYAxisLabels ? 0 : 40}
            tickFormatter={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(2))}
          />
          {rightSeriesNames.length > 0 && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={!hideYAxisLabels ? AXIS_TICK_STYLE : false}
              axisLine={false}
              tickLine={false}
              tickCount={5}
              width={hideYAxisLabels ? 0 : 40}
              tickFormatter={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(2))}
            />
          )}
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length || !label) return null;
              return (
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-card dark:border-gray-600 dark:bg-gray-800">
                  <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {formatTimestamp(label)}
                  </p>
                  <div className="space-y-1">
                    {payload.map((entry) => (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between gap-4"
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {entry.name}: {String(entry.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
            cursor={{ stroke: "#9CA3AF", strokeDasharray: "4 4" }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingTop: 0 }}
            formatter={(value) => (
              <span
                role="button"
                tabIndex={0}
                className={cn(
                  "cursor-pointer rounded px-1.5 py-0.5 text-sm transition hover:bg-gray-100 hover:opacity-100 dark:hover:bg-gray-700",
                  hiddenSeries.has(value)
                    ? "text-gray-400 line-through dark:text-gray-500"
                    : "text-gray-700 dark:text-gray-300"
                )}
                onClick={() => toggleSeries(value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSeries(value);
                  }
                }}
              >
                {value}
              </span>
            )}
          />
          {seriesNames.map((name, i) => {
            const yAxisId = rightSeriesNames.includes(name) ? "right" : "left";
            return (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                yAxisId={yAxisId}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2.5}
                strokeOpacity={hiddenSeries.has(name) ? 0.25 : 1}
                hide={hiddenSeries.has(name)}
                dot={{ r: 3 }}
                activeDot={{ r: 5, strokeWidth: 2 }}
                name={name}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
