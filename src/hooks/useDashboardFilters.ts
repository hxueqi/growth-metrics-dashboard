"use client";

import { useState, useMemo } from "react";
import {
  getDateRangeForPreset,
  getPreviousPeriodRange,
  toDateTimeLocal,
  type TimeRangePreset,
  type DateRangeInput,
} from "@/lib/date";
import type { MetricsQueryParams, BreakdownDimensionId, MetricSelection } from "@/types/metric";

const INITIAL_PRESET: TimeRangePreset = "7d";

function getInitialDateRange(): DateRangeInput {
  const { startDate, endDate } = getDateRangeForPreset(7);
  return {
    startDate: toDateTimeLocal(new Date(startDate)),
    endDate: toDateTimeLocal(new Date(endDate)),
  };
}

export interface DashboardFiltersState {
  preset: TimeRangePreset;
  dateRange: DateRangeInput;
  metricSelection: MetricSelection;
  breakdownBy: BreakdownDimensionId | "";
}

export interface UseDashboardFiltersReturn {
  filters: DashboardFiltersState;
  setPreset: (preset: TimeRangePreset) => void;
  setDateRange: (range: DateRangeInput | ((prev: DateRangeInput) => DateRangeInput)) => void;
  setMetricSelection: (value: MetricSelection | ((prev: MetricSelection) => MetricSelection)) => void;
  setBreakdownBy: (value: BreakdownDimensionId | "") => void;
  currentParams: MetricsQueryParams;
  previousParams: MetricsQueryParams;
}

/**
 * Centralized filter state for the dashboard. Single source of truth for
 * time range, metric selection, and breakdown dimension.
 */
export function useDashboardFilters(): UseDashboardFiltersReturn {
  const [preset, setPreset] = useState<TimeRangePreset>(INITIAL_PRESET);
  const [dateRange, setDateRange] = useState<DateRangeInput>(getInitialDateRange);
  const [metricSelection, setMetricSelection] = useState<MetricSelection>({
    metricName: "",
    variant: "",
  });
  const [breakdownBy, setBreakdownBy] = useState<BreakdownDimensionId | "">("");

  const currentParams = useMemo<MetricsQueryParams>(() => {
    const startDate = new Date(dateRange.startDate).toISOString();
    const endDate = new Date(dateRange.endDate).toISOString();
    const params: MetricsQueryParams = { startDate, endDate };
    if (metricSelection.metricName.trim()) {
      params.name = metricSelection.metricName.trim();
    }
    return params;
  }, [dateRange.startDate, dateRange.endDate, metricSelection.metricName]);

  const previousParams = useMemo<MetricsQueryParams>(() => {
    const prev = getPreviousPeriodRange(currentParams.startDate!, currentParams.endDate!);
    return {
      ...currentParams,
      startDate: prev.startDate,
      endDate: prev.endDate,
    };
  }, [currentParams]);

  return {
    filters: {
      preset,
      dateRange,
      metricSelection,
      breakdownBy,
    },
    setPreset,
    setDateRange,
    setMetricSelection,
    setBreakdownBy,
    currentParams,
    previousParams,
  };
}
