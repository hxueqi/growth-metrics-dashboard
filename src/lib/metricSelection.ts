import type { RawMetricOption } from "@/types/metric";

/**
 * Returns the first two metric names that share the same unit, for default chart selection.
 * If no unit has ≥2 metrics, returns the first metric. If none, returns [].
 */
export function getDefaultMetricSelection(rawMetrics: RawMetricOption[]): string[] {
  if (rawMetrics.length === 0) return [];
  const byUnit = new Map<string, string[]>();
  for (const m of rawMetrics) {
    const u = (m.unit ?? "Count").toLowerCase();
    if (!byUnit.has(u)) byUnit.set(u, []);
    byUnit.get(u)!.push(m.name);
  }
  for (const names of byUnit.values()) {
    if (names.length >= 2) return names.slice(0, 2);
  }
  return [rawMetrics[0].name];
}
