/**
 * Centralized copy for dashboard empty states and CTAs.
 * Use these constants instead of inline strings for consistency and i18n readiness.
 */

export const COPY = {
  /** Chart empty state when no metrics are selected (primary message). */
  emptyChartSelectMetric: "Select a metric to visualize data",
  /** Chart empty state when no metrics are selected (secondary message). */
  emptyChartSelectMetricSecondary: "Choose one or more metrics in the dropdown above.",
  /** Chart card title when the database has no metrics. */
  emptyNoMetricsTitle: "No metrics yet",
  /** CTA button label in the no-metrics empty state. */
  emptyNoMetricsCta: "Load sample dataset to get started",
  /** Short copy in the no-metrics empty state (above the CTA). */
  emptyNoMetricsCopy: "We'll add example metrics so you can try the chart.",
  /** Chart empty state when there is no data in the selected time range (primary). */
  emptyChartNoDataPrimary: "No data in this time range",
  /** Chart empty state when there is no data in the selected time range (secondary). */
  emptyChartNoDataSecondary: "Add a metric or load the sample dataset to explore the funnel.",
  /** Label for the load sample dataset button in chart empty states. */
  emptyChartLoadSampleLabel: "Load sample dataset",
  /** Label for the add data point button in chart empty states. */
  emptyChartAddDataLabel: "Add data point",
  /** Chart empty state when no data for selected metrics in range (primary). */
  emptyChartNoDataForRangePrimary: "No data for selected metrics in this range",
  /** Chart empty state when no data for selected metrics in range (secondary). */
  emptyChartNoDataForRangeSecondary: "Select different metrics or change the time range.",
} as const;
