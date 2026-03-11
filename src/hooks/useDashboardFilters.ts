"use client";

import { useState, useMemo } from "react";
import {
  getDateRangeForPreset,
  toDateTimeLocal,
  type TimeRangePreset,
  type DateRangeInput,
} from "@/lib/date";
import { DEFAULT_DATE_RANGE_DAYS } from "@/lib/constants";
import type { MetricsQueryParams, BreakdownDimensionId } from "@/types/metric";

const INITIAL_PRESET: TimeRangePreset = "7d";

function getInitialDateRange(): DateRangeInput {
  const { startDate, endDate } = getDateRangeForPreset(DEFAULT_DATE_RANGE_DAYS);
  return {
    startDate: toDateTimeLocal(new Date(startDate)),
    endDate: toDateTimeLocal(new Date(endDate)),
  };
}

/** Selected metric names. [] = none (empty chart). Default is set by Dashboard from first two same-unit metrics. */
export type MetricSelection = string[];

export interface DashboardFiltersState {
  preset: TimeRangePreset;
  dateRange: DateRangeInput;
  selectedMetricNames: MetricSelection;
  breakdownBy: BreakdownDimensionId | "";
}

export interface UseDashboardFiltersReturn {
  filters: DashboardFiltersState;
  setPreset: (preset: TimeRangePreset) => void;
  setDateRange: (range: DateRangeInput | ((prev: DateRangeInput) => DateRangeInput)) => void;
  setSelectedMetricNames: (value: MetricSelection | ((prev: MetricSelection) => MetricSelection)) => void;
  setBreakdownBy: (value: BreakdownDimensionId | "") => void;
  currentParams: MetricsQueryParams;
}

/**
 * Centralized filter state for the dashboard. Single source of truth for
 * time range and metric selection (multi-select).
 */
export function useDashboardFilters(): UseDashboardFiltersReturn {
  const [preset, setPreset] = useState<TimeRangePreset>(INITIAL_PRESET);
  const [dateRange, setDateRange] = useState<DateRangeInput>(getInitialDateRange);
  const [selectedMetricNames, setSelectedMetricNames] = useState<MetricSelection>([]);
  const [breakdownBy, setBreakdownBy] = useState<BreakdownDimensionId | "">("");

  const currentParams = useMemo<MetricsQueryParams>(() => {
    const startDate = new Date(dateRange.startDate).toISOString();
    const endDate = new Date(dateRange.endDate).toISOString();
    const params: MetricsQueryParams = { startDate, endDate };
    if (selectedMetricNames.length === 0) {
      params.empty = true;
    } else {
      params.names = selectedMetricNames;
    }
    return params;
  }, [dateRange.startDate, dateRange.endDate, selectedMetricNames]);

  return {
    filters: {
      preset,
      dateRange,
      selectedMetricNames,
      breakdownBy,
    },
    setPreset,
    setDateRange,
    setSelectedMetricNames,
    setBreakdownBy,
    currentParams,
  };
}
