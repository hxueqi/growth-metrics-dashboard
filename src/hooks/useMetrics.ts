"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { metricsService } from "@/services";
import type { Metric, MetricsQueryParams } from "@/types/metric";

interface UseMetricsOptions {
  params: MetricsQueryParams;
}

interface UseMetricsResult {
  metrics: Metric[];
  error: Error | null;
  isLoading: boolean;
  revalidate: () => Promise<unknown>;
}

/**
 * Fetch metrics with SWR. No background polling; revalidate on demand (e.g. after add metric / load sample).
 * Keeps data logic out of the Dashboard component.
 */
export function useMetrics({ params }: UseMetricsOptions): UseMetricsResult {
  const key = ["/api/metrics", params.name, params.startDate, params.endDate] as const;

  const { data, error, isLoading, mutate } = useSWR<Metric[]>(
    key,
    () => metricsService.fetchMetrics(params),
    {
      revalidateOnReconnect: true,
    }
  );

  const revalidate = useCallback(() => mutate(undefined, { revalidate: true }), [mutate]);

  return {
    metrics: data ?? [],
    error: error ?? null,
    isLoading,
    revalidate,
  };
}
