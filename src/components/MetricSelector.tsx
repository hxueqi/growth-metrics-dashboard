"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { MetricSelection } from "@/hooks/useDashboardFilters";
import type { RawMetricOption } from "@/types/metric";

export interface MetricSelectorProps {
  /** Raw metrics (name + unit) from the database. */
  rawMetrics: RawMetricOption[];
  value: MetricSelection;
  onChange: (value: MetricSelection) => void;
  label?: string;
  /** Shown in the closed dropdown when no metrics are selected. */
  placeholder?: string;
  /** Called when user removes a metric from the dataset (deletes all its data). */
  onRemoveMetric?: (name: string) => void | Promise<void>;
}

/** Display unit in dropdown (e.g. count, %, €). Uses actual .unit from the object; supports any casing. */
function formatUnit(unit: string | undefined): string {
  const u = (unit ?? "Count").trim().toLowerCase();
  if (u === "percentage") return "%";
  if (u === "currency") return "€";
  if (u === "seconds") return "s";
  if (u === "custom") return "custom";
  return "count";
}

function formatSummary(value: MetricSelection, placeholder: string): string {
  if (value.length === 0) return placeholder;
  if (value.length <= 2) return value.join(", ");
  return `${value[0]}, ${value[1]} +${value.length - 2}`;
}

const SAME_UNIT_NOTE = "Only metrics with the same unit can be combined in a multi-metric chart.";
const DISABLED_TOOLTIP = "Cannot combine different units on one chart.";

/**
 * Multi-select dropdown: show unit next to each metric (e.g. "Website Visits (count)").
 * Only allow multi-selection of metrics with the same unit.
 */
export function MetricSelector({
  rawMetrics,
  value,
  onChange,
  onRemoveMetric,
  label = "Metrics",
  placeholder = "Search or select metrics...",
}: MetricSelectorProps) {
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedList = value;
  const selectedSet = new Set(selectedList);

  const getUnit = (name: string): string =>
    rawMetrics.find((m) => m.name === name)?.unit ?? "Count";

  const selectedUnit = selectedList.length > 0 ? getUnit(selectedList[0]) : null;
  const canSelect = (name: string): boolean => {
    if (selectedList.length === 0) return true;
    return getUnit(name) === selectedUnit;
  };

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleToggle = (name: string) => {
    if (selectedSet.has(name)) {
      onChange(value.filter((n) => n !== name));
    } else {
      if (!canSelect(name)) return;
      onChange([...value, name]);
    }
  };

  const handleRemove = async (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onRemoveMetric || removing) return;
    setRemoving(name);
    try {
      await onRemoveMetric(name);
      onChange(value.filter((n) => n !== name));
    } catch {
      // Delete failed; parent shows error. Do not update selection.
    } finally {
      setRemoving(null);
    }
  };

  if (rawMetrics.length === 0) {
    return (
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400" role="note">
          {SAME_UNIT_NOTE}
        </p>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
          {placeholder}
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400" role="note" title={SAME_UNIT_NOTE}>
        {SAME_UNIT_NOTE}
      </p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-gray-900 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-slate-600 dark:bg-gray-800 dark:text-white",
          open && "ring-2 ring-factorial-accent ring-offset-1 border-factorial-accent dark:ring-offset-gray-900"
        )}
      >
        <span
          className={cn(
            "truncate",
            selectedList.length === 0 && "text-slate-500 dark:text-slate-400"
          )}
        >
          {formatSummary(value, placeholder)}
        </span>
        <svg
          className={cn("h-4 w-4 shrink-0 text-slate-500 transition", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-gray-800"
        >
          {selectedList.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full border-b border-slate-100 px-3 py-2 text-left text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:hover:bg-gray-700 dark:hover:text-slate-300"
              title="Clear selection"
            >
              Clear all
            </button>
          )}
          {rawMetrics.map((m) => {
            const disabled = !canSelect(m.name);
            const labelText = `${m.name} (${formatUnit(m.unit)})`;
            const isRemoving = removing === m.name;
            return (
              <div
                key={m.name}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-gray-700",
                  disabled && "opacity-60"
                )}
              >
                <label className={cn("flex flex-1 min-w-0 cursor-pointer items-center gap-2", disabled && "cursor-not-allowed")} title={disabled ? DISABLED_TOOLTIP : undefined}>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(m.name)}
                    disabled={disabled}
                    onChange={() => handleToggle(m.name)}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-factorial-accent focus:ring-factorial-accent"
                  />
                  <span className="truncate">{labelText}</span>
                </label>
                {onRemoveMetric && (
                  <button
                    type="button"
                    onClick={(e) => handleRemove(e, m.name)}
                    disabled={isRemoving}
                    className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-factorial-accent disabled:opacity-50 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                    title="Remove this metric from the dataset"
                    aria-label={`Remove ${m.name} from dataset`}
                  >
                    {isRemoving ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" aria-hidden />
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
