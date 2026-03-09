import { prisma } from "@/lib/prisma";

/** Input for creating a new metric. */
export interface CreateMetricData {
  name: string;
  value: number;
  timestamp?: Date;
  variant?: string | null;
  country?: string | null;
  device?: string | null;
  segment?: string | null;
}

/** Filters for querying metrics. */
export interface GetMetricsParams {
  name?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Create a new metric. Omitted timestamp defaults to now() in the schema.
 */
export async function createMetric(data: CreateMetricData) {
  return prisma.metric.create({
    data: {
      name: data.name,
      value: data.value,
      ...(data.timestamp && { timestamp: data.timestamp }),
      ...(data.variant !== undefined && { variant: data.variant ?? null }),
      ...(data.country !== undefined && { country: data.country ?? null }),
      ...(data.device !== undefined && { device: data.device ?? null }),
      ...(data.segment !== undefined && { segment: data.segment ?? null }),
    },
  });
}

/**
 * Fetch metrics with optional filters. Always sorted by timestamp ascending.
 */
export async function getMetrics(params?: GetMetricsParams) {
  const where: { name?: string; timestamp?: { gte?: Date; lte?: Date } } = {};

  if (params?.name) {
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
    take: 5000,
  });
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
