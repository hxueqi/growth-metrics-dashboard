/**
 * Generates a coherent sample dataset: acquisition & activation funnel over two
 * equal consecutive 30-day windows so "Vs previous period" works for 7d and 30d.
 * One point per metric per day; same metric names in both windows.
 */

import { SAMPLE_METRIC_NAMES } from "./constants";

/** Two consecutive 30-day windows (current + previous) for 7d and 30d comparison. */
const SAMPLE_DAYS = 60;

export interface SampleMetricPayload {
  name: string;
  value: number;
  timestamp: string;
  variant?: string | null;
  country?: string | null;
  device?: string | null;
  segment?: string | null;
}

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
  };
}

/**
 * Coherent funnel over the last SAMPLE_DAYS (60) days: current 30-day window
 * plus previous 30-day window. Same metric names in both; enables "Vs previous period"
 * for Last 7 days and Last 30 days.
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
        valueForDay(28, 52, dayIndex),
        daysAgo
      )
    );
    payloads.push(
      pointForMetricAndDay(
        "Demo Bookings",
        valueForDay(10, 24, dayIndex),
        daysAgo
      )
    );
    payloads.push(
      pointForMetricAndDay(
        "Trial Conversions",
        valueForDay(4, 12, dayIndex),
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
