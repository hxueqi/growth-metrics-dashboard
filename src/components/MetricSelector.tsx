"use client";

import type { MetricSelection } from "@/types/metric";

const SELECT_CLASS =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white min-w-0";

export type { MetricSelection };

export interface MetricSelectorProps {
  /** Available metric names (e.g. from API + example names). */
  metricOptions: string[];
  /** Available variants (from data). Use empty array to hide variant filter. */
  variantOptions: string[];
  /** Current selection. metricName "" = "All metrics". */
  value: MetricSelection;
  onChange: (selection: MetricSelection) => void;
  placeholder?: string;
}

export function MetricSelector({
  metricOptions,
  variantOptions,
  value,
  onChange,
  placeholder = "All metrics",
}: MetricSelectorProps) {
  const showVariant = variantOptions.length > 0;

  return (
    <div className="flex min-w-0 flex-wrap items-end gap-4">
      <div className="min-w-0 flex-1 basis-0">
        <label
          htmlFor="metric-name-select"
          className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400"
        >
          Metric
        </label>
        <select
          id="metric-name-select"
          value={value.metricName}
          onChange={(e) => onChange({ ...value, metricName: e.target.value })}
          className={SELECT_CLASS}
        >
          <option value="">{placeholder}</option>
          {metricOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {showVariant && (
        <div className="min-w-0 flex-1 basis-0">
          <label
            htmlFor="metric-variant-select"
            className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400"
          >
            Variant
          </label>
          <select
            id="metric-variant-select"
            value={value.variant}
            onChange={(e) => onChange({ ...value, variant: e.target.value })}
            className={SELECT_CLASS}
          >
            <option value="">All</option>
            {variantOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
