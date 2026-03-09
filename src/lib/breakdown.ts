/**
 * Breakdown / segmentation configuration. Add new dimensions here to extend.
 */

import type { BreakdownDimensionConfig, BreakdownDimensionId, Metric } from "@/types/metric";

export const BREAKDOWN_DIMENSIONS: BreakdownDimensionConfig[] = [
  { id: "variant", label: "Variant", field: "variant" },
  { id: "country", label: "Country", field: "country" },
  { id: "device", label: "Device", field: "device" },
  { id: "segment", label: "Custom segment", field: "segment" },
];

const EMPTY_LABEL = "—";

/**
 * Get the segment value for a metric for a given dimension.
 */
export function getBreakdownValue(
  metric: Metric,
  dimensionId: BreakdownDimensionId
): string {
  const config = BREAKDOWN_DIMENSIONS.find((d) => d.id === dimensionId);
  if (!config) return EMPTY_LABEL;
  const value = metric[config.field];
  if (value === null || value === undefined || String(value).trim() === "") {
    return EMPTY_LABEL;
  }
  return String(value).trim();
}
