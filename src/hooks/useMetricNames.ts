"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { metricsService } from "@/services";
import type { RawMetricOption } from "@/types/metric";

const METRIC_NAMES_KEY = "/api/metrics/names";

export interface UseMetricNamesResult {
  names: string[];
  rawMetrics: RawMetricOption[];
  error: Error | null;
  isLoading: boolean;
  revalidate: () => Promise<unknown>;
}

/**
 * Fetch distinct metric names with units (for selector and form).
 */
export function useMetricNames(): UseMetricNamesResult {
  const { data, error, isLoading, mutate } = useSWR<RawMetricOption[]>(
    METRIC_NAMES_KEY,
    () => metricsService.fetchMetricNamesWithUnits(),
    { revalidateOnReconnect: true }
  );
  const rawMetrics = data ?? [];

  const revalidate = useCallback(() => mutate(undefined, { revalidate: true }), [mutate]);

  return {
    names: rawMetrics.map((m) => m.name),
    rawMetrics,
    error: error ?? null,
    isLoading,
    revalidate,
  };
}
