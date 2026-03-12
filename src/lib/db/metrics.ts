import { prisma } from "@/lib/prisma";
import { API_METRICS_LIMIT } from "@/lib/constants";

const METRIC_UNITS = ["Count", "Percentage", "Currency", "Seconds"] as const;
const UNIT_ALIASES: Record<string, (typeof METRIC_UNITS)[number]> = {
  count: "Count",
  percentage: "Percentage",
  currency: "Currency",
  seconds: "Seconds",
};

function normalizeUnit(raw: string | undefined): (typeof METRIC_UNITS)[number] {
  if (!raw || typeof raw !== "string" || !raw.trim()) return "Count";
  const key = raw.trim().toLowerCase();
  return UNIT_ALIASES[key] ?? (METRIC_UNITS.includes(raw.trim() as (typeof METRIC_UNITS)[number]) ? (raw.trim() as (typeof METRIC_UNITS)[number]) : "Count");
}

/** Input for creating a new metric. */
export interface CreateMetricData {
  name: string;
  value: number;
  timestamp?: Date;
  unit?: string;
}

export interface MetricNameWithUnit {
  name: string;
  unit: string;
}

/** Filters for querying metrics. */
export interface GetMetricsParams {
  name?: string;
  /** When provided, filter to metrics whose name is in this array. */
  names?: string[];
  startDate?: Date;
  endDate?: Date;
}

/**
 * Create a new metric. Omitted timestamp defaults to now() in the schema.
 */
export async function createMetric(data: CreateMetricData) {
  const unit = normalizeUnit(data.unit);
  return prisma.metric.create({
    data: {
      name: data.name,
      value: data.value,
      unit,
      ...(data.timestamp && { timestamp: data.timestamp }),
    },
  });
}

/** Input item for batch create (timestamp as Date). */
export interface CreateMetricBatchItem extends Omit<CreateMetricData, "timestamp"> {
  timestamp: Date;
}

/**
 * Insert multiple metrics in a single query. Use for sample data or bulk import.
 */
export async function createMetricsBatch(data: CreateMetricBatchItem[]): Promise<{ count: number }> {
  if (data.length === 0) return { count: 0 };
  const rows = data.map((d) => ({
    name: d.name,
    value: d.value,
    timestamp: d.timestamp,
    unit: normalizeUnit(d.unit),
  }));
  const result = await prisma.metric.createMany({ data: rows });
  return { count: result.count };
}

/**
 * Fetch metrics with optional filters. Always sorted by timestamp ascending.
 */
export async function getMetrics(params?: GetMetricsParams) {
  const where: { name?: string | { in: string[] }; timestamp?: { gte?: Date; lte?: Date } } = {};

  if (params?.names?.length) {
    where.name = { in: params.names };
  } else if (params?.name) {
    where.name = params.name;
  }

  if (params?.startDate ?? params?.endDate) {
    where.timestamp = {};
    if (params.startDate) where.timestamp.gte = params.startDate;
    if (params.endDate) where.timestamp.lte = params.endDate;
  }

  return prisma.metric.findMany({
    where,
    orderBy: { timestamp: "asc" },
    take: API_METRICS_LIMIT,
  });
}

/**
 * Get distinct metric names with unit (most recent unit per name). Sorted A–Z.
 */
export async function getDistinctMetricNamesWithUnits(): Promise<MetricNameWithUnit[]> {
  const rows = await prisma.metric.findMany({
    select: { name: true, unit: true },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  });
  const byName = new Map<string, string>();
  for (const r of rows) {
    if (!byName.has(r.name)) byName.set(r.name, r.unit);
  }
  return Array.from(byName.entries()).map(([name, unit]) => ({ name, unit }));
}

export async function getDistinctMetricNames(): Promise<string[]> {
  const result = await getDistinctMetricNamesWithUnits();
  return result.map((r) => r.name);
}

/**
 * Delete metrics whose name is in the given list and timestamp is in [startDate, endDate].
 * Used to clear sample data in a range before re-inserting (e.g. upgrade 7-day to 14-day).
 */
export async function deleteMetricsByNamesAndDateRange(
  names: string[],
  startDate: Date,
  endDate: Date
): Promise<number> {
  if (names.length === 0) return 0;
  const result = await prisma.metric.deleteMany({
    where: {
      name: { in: names },
      timestamp: { gte: startDate, lte: endDate },
    },
  });
  return result.count;
}

/**
 * Delete all metrics with the given name (all data points for that metric).
 * Used when a user removes a metric from the dataset.
 */
export async function deleteMetricsByName(name: string): Promise<number> {
  if (!name || !name.trim()) return 0;
  const result = await prisma.metric.deleteMany({
    where: { name: name.trim() },
  });
  return result.count;
}
