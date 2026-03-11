/**
 * Generates a coherent sample dataset: acquisition & activation funnel over two
 * equal consecutive 30-day windows so "Vs previous period" works for 7d and 30d.
 * One point per metric per day; same metric names in both windows.
 */

import { SAMPLE_METRIC_NAMES, SAMPLE_DAYS } from "./constants";

export interface SampleMetricPayload {
  name: string;
  value: number;
  timestamp: string;
  unit: string;
  variant?: string | null;
  country?: string | null;
  device?: string | null;
  segment?: string | null;
}

/** Unit per sample metric name. Stored in DB (Count/Currency/Percentage/Seconds). */
const SAMPLE_METRIC_UNIT: Record<string, string> = {
  "Website Visits": "Count",
  "Signups": "Count",
  "Activated Users": "Count",
  "Revenue": "Currency",
  "Ad Spend": "Currency",
  "Conversion Rate": "Percentage",
  "Churn Rate": "Percentage",
  "Page Load Time": "Seconds",
};

/** Legacy sample names to clear in date range when loading (no longer generated). */
const LEGACY_SAMPLE_NAMES = ["Trial Conversions", "Monthly Revenue", "Demo Bookings"];

/** Metric names to remove from the entire DB when Load Sample Dataset runs, so they never persist in the UI dropdown. */
export const NAMES_TO_FULLY_REMOVE_ON_SAMPLE_LOAD = ["Demo Bookings", "staytime"];

/** Value with slight upward trend: dayIndex 0 = oldest, dayIndex = SAMPLE_DAYS-1 = today. */
function valueForDay(
  baseMin: number,
  baseMax: number,
  dayIndex: number
): number {
  const trend = 1 + (dayIndex / SAMPLE_DAYS) * 0.5;
  const base = baseMin + Math.random() * (baseMax - baseMin);
  return Math.round(base * trend);
}

/**
 * Build one data point for a given metric and day.
 * Uses noon for consistent, readable timestamps in the chart.
 */
function pointForMetricAndDay(
  metricName: string,
  value: number,
  daysAgo: number
): SampleMetricPayload {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(12, 0, 0, 0);
  return {
    name: metricName,
    value,
    timestamp: date.toISOString(),
    unit: SAMPLE_METRIC_UNIT[metricName] ?? "Count",
  };
}

/**
 * Coherent funnel over the last SAMPLE_DAYS (90) days: one point per metric per day.
 * Enables time range filters (7d / 30d / 90d) and previous-period comparisons.
 */
export function generateSampleMetrics(): SampleMetricPayload[] {
  const payloads: SampleMetricPayload[] = [];

  for (let dayIndex = 0; dayIndex < SAMPLE_DAYS; dayIndex++) {
    const daysAgo = SAMPLE_DAYS - 1 - dayIndex;

    payloads.push(
      pointForMetricAndDay(
        "Website Visits",
        valueForDay(820, 1180, dayIndex),
        daysAgo
      )
    );
    payloads.push(
      pointForMetricAndDay(
        "Signups",
        valueForDay(52, 88, dayIndex),
        daysAgo
      )
    );
    payloads.push(
      pointForMetricAndDay(
        "Activated Users",
        valueForDay(38, 72, dayIndex),
        daysAgo
      )
    );
    payloads.push(
      pointForMetricAndDay(
        "Revenue",
        valueForDay(4200, 9800, dayIndex),
        daysAgo
      )
    );
    payloads.push(
      pointForMetricAndDay(
        "Ad Spend",
        valueForDay(800, 2200, dayIndex),
        daysAgo
      )
    );
    payloads.push(
      pointForMetricAndDay(
        "Conversion Rate",
        Math.min(100, Math.max(0, valueForDay(3.2, 6.8, dayIndex))),
        daysAgo
      )
    );
    payloads.push(
      pointForMetricAndDay(
        "Churn Rate",
        Math.min(100, Math.max(0, valueForDay(1.2, 3.5, dayIndex))),
        daysAgo
      )
    );
    payloads.push(
      pointForMetricAndDay(
        "Page Load Time",
        valueForDay(1.2, 3.8, dayIndex),
        daysAgo
      )
    );
  }

  return payloads;
}

/** Metric names used by the sample dataset (for safeguard checks). */
export function getSampleMetricNames(): string[] {
  return [...SAMPLE_METRIC_NAMES];
}

/** Names to clear when loading sample data (current + legacy so old data is removed). */
export function getSampleMetricNamesToClear(): string[] {
  return [...SAMPLE_METRIC_NAMES, ...LEGACY_SAMPLE_NAMES];
}
