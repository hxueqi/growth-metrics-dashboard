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
import type { Metric } from "@/types/metric";
import { formatTimestamp, formatChartAxisLabel, formatChartYAxisValue, formatChartTooltipValue, type ChartTimeRangePreset } from "@/lib/format";
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
  /** Current time range preset for X-axis label formatting (7d/30d = "MMM dd" only). */
  timeRangePreset?: ChartTimeRangePreset;
  /** When true (e.g. "All metrics"), use a secondary Y-axis for smaller-scale series. */
  useDualYAxis?: boolean;
  /** Custom empty state when there is no data to plot. */
  emptyState?: ChartEmptyStateConfig;
  /** Optional class for the chart container (e.g. full-screen height). */
  containerClassName?: string;
  /** When true, show "Click a metric in the legend to show or hide it." below the legend. */
  legendHint?: boolean;
  /** Metric name -> unit for Y-axis and tooltip formatting. */
  metricUnits?: Record<string, string>;
  /** Start of chart range (ISO). When set with dateRangeEnd, single-point series are expanded to a full timeline. */
  dateRangeStart?: string;
  /** End of chart range (ISO). When set with dateRangeStart, single-point series are expanded to a full timeline. */
  dateRangeEnd?: string;
  /** Pre-built data not used. */
  series?: never;
  seriesNames?: never;
}

/** Props when passing pre-built series (reusable for any source). */
export interface MetricsChartSeriesProps {
  metrics?: never;
  selectedName?: never;
  timeRangePreset?: ChartTimeRangePreset;
  useDualYAxis?: boolean;
  emptyState?: ChartEmptyStateConfig;
  containerClassName?: string;
  /** When true, show "Click a metric in the legend to show or hide it." below the legend. */
  legendHint?: boolean;
  /** Metric name -> unit for Y-axis and tooltip formatting. */
  metricUnits?: Record<string, string>;
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
  const { series: rawSeries, seriesNames } = useMemo(() => {
    if (isSeriesProps(props)) {
      return { series: props.series, seriesNames: props.seriesNames };
    }
    const metricsList = Array.isArray(props.metrics) ? props.metrics : [];
    if (!Array.isArray(props.metrics)) {
      console.warn("[MetricsChart] Expected metrics to be an array.", { received: props.metrics });
    }
    return buildSeriesFromMetrics(metricsList, {
      selectedName: props.selectedName,
    });
  }, [
    props.metrics,
    props.series,
    props.seriesNames,
    props.selectedName,
  ]);

  /**
   * For series that only have a single non-null data point, expand the timeline so a line is drawn:
   * use the dashboard date range to add rows with value 0 before/after the real point.
   * Multi-point series are left unchanged.
   */
  const series = useMemo(() => {
    if (!rawSeries || rawSeries.length === 0 || seriesNames.length === 0) return rawSeries;

    const singlePointSeries = new Set<string>();
    for (const name of seriesNames) {
      let count = 0;
      for (const row of rawSeries) {
        const v = row[name];
        if (typeof v === "number") {
          count += 1;
          if (count > 1) break;
        }
      }
      if (count === 1) singlePointSeries.add(name);
    }

    if (singlePointSeries.size === 0) return rawSeries;

    const dateRangeStart = "dateRangeStart" in props ? props.dateRangeStart : undefined;
    const dateRangeEnd = "dateRangeEnd" in props ? props.dateRangeEnd : undefined;

    if (dateRangeStart && dateRangeEnd && singlePointSeries.size > 0) {
      const start = new Date(dateRangeStart);
      const end = new Date(dateRangeEnd);
      const timeSet = new Set<string>();

      for (const row of rawSeries) {
        const t = row.time;
        if (typeof t === "string") timeSet.add(t);
      }
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      for (let d = new Date(startDay); d.getTime() <= endDay.getTime(); d.setDate(d.getDate() + 1)) {
        timeSet.add(new Date(d).toISOString());
      }

      const sortedTimes = [...timeSet].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const byTime = new Map<string, Record<string, string | number>>();
      for (const row of rawSeries) {
        const t = row.time;
        if (typeof t === "string") byTime.set(t, { ...row });
      }

      const expanded: Record<string, string | number>[] = [];
      for (const time of sortedTimes) {
        const existing = byTime.get(time);
        const row: Record<string, string | number> = { time };
        for (const name of seriesNames) {
          if (existing && typeof existing[name] === "number") {
            row[name] = existing[name];
          } else {
            row[name] = 0;
          }
        }
        expanded.push(row);
      }
      return expanded;
    }

    return rawSeries.map((row) => {
      const next = { ...row };
      singlePointSeries.forEach((name) => {
        if (typeof next[name] !== "number") next[name] = 0;
      });
      return next;
    });
  }, [
    rawSeries,
    seriesNames,
    "dateRangeStart" in props ? props.dateRangeStart : undefined,
    "dateRangeEnd" in props ? props.dateRangeEnd : undefined,
  ]);

  const timeRangePreset = "timeRangePreset" in props ? props.timeRangePreset : undefined;
  const xAxisFormatter = useCallback(
    (value: string) => formatChartAxisLabel(value, timeRangePreset),
    [timeRangePreset]
  );

  const emptyState = "emptyState" in props ? props.emptyState : undefined;
  const useDualYAxis = "useDualYAxis" in props ? props.useDualYAxis : false;
  const legendHint = "legendHint" in props ? props.legendHint : false;
  const metricUnits = "metricUnits" in props ? props.metricUnits : undefined;
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(() => new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [hideYAxisLabels, setHideYAxisLabels] = useState(false);

  /** Visible series (not hidden by legend). Used for unit detection. */
  const visibleSeriesNames = useMemo(
    () => seriesNames.filter((n) => !hiddenSeries.has(n)),
    [seriesNames, hiddenSeries]
  );
  /** Single unit for Y-axis when all visible series share the same unit; otherwise undefined to avoid overlap. */
  const activeUnit = useMemo(() => {
    if (!metricUnits || visibleSeriesNames.length === 0) return undefined;
    const units = new Set(visibleSeriesNames.map((n) => metricUnits[n]).filter(Boolean));
    if (units.size !== 1) return undefined;
    return [...units][0];
  }, [metricUnits, visibleSeriesNames]);

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

  const toggleSeries = useCallback((dataKey: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) next.delete(dataKey);
      else next.add(dataKey);
      return next;
    });
  }, []);

  const yAxisTickFormatter = useCallback(
    (v: number) => formatChartYAxisValue(v, activeUnit),
    [activeUnit]
  );

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
    right: hideYAxisLabels ? NARROW_MARGIN_RIGHT : CHART_MARGIN.right,
  };

  return (
    <div ref={containerRef} className={cn(containerClass, "flex flex-col")} role="img" aria-label={chartAriaLabel}>
      <div className="min-h-0 flex-1">
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
            orientation="left"
            yAxisId="left"
            tick={!hideYAxisLabels ? AXIS_TICK_STYLE : false}
            axisLine={false}
            tickLine={false}
            tickCount={5}
            width={hideYAxisLabels ? 0 : 40}
            tickFormatter={yAxisTickFormatter}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length || !label) return null;
              return (
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-card dark:border-gray-600 dark:bg-gray-800">
                  <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {formatTimestamp(label)}
                  </p>
                  <div className="space-y-1">
                    {payload.map((entry) => {
                      const name = entry.name ?? "";
                      const unit = metricUnits?.[name];
                      const raw = typeof entry.value === "number" ? entry.value : Number(entry.value);
                      const displayValue = Number.isFinite(raw)
                        ? formatChartTooltipValue(raw, unit)
                        : String(entry.value);
                      return (
                        <div
                          key={name}
                          className="flex items-center justify-between gap-4"
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                            {name}: {displayValue}
                          </span>
                        </div>
                      );
                    })}
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
            content={({ payload }) => (
              <div className="flex flex-col items-end">
                <div className="flex flex-wrap justify-end gap-x-2 gap-y-0.5">
                  {payload?.map((entry, idx) => (
                    <span
                      key={entry.value}
                      role="button"
                      tabIndex={0}
                      title={entry.value}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 text-sm transition hover:bg-gray-100 hover:opacity-100 dark:hover:bg-gray-700 max-w-[140px] truncate",
                        hiddenSeries.has(entry.value)
                          ? "text-gray-400 line-through dark:text-gray-500"
                          : "text-gray-700 dark:text-gray-300"
                      )}
                      onClick={() => toggleSeries(entry.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleSeries(entry.value);
                        }
                      }}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color ?? CHART_COLORS[idx % CHART_COLORS.length] }}
                        aria-hidden
                      />
                      <span className="truncate">{entry.value}</span>
                    </span>
                  ))}
                </div>
                {legendHint && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Click a metric in the legend to show or hide it.
                  </p>
                )}
              </div>
            )}
          />
          {seriesNames.map((name, i) => {
              const lineColor = CHART_COLORS[i % CHART_COLORS.length];
              return (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                yAxisId="left"
                stroke={lineColor}
                strokeWidth={2.5}
                strokeOpacity={hiddenSeries.has(name) ? 0.25 : 1}
                hide={hiddenSeries.has(name)}
                dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: lineColor, strokeWidth: 2, stroke: lineColor }}
                name={name}
                connectNulls
              />
              );
          })}
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
