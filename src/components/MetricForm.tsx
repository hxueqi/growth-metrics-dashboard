"use client";

import { useState, useEffect } from "react";
import { metricsService } from "@/services";
import type { Metric } from "@/types/metric";
import { METRIC_UNIT_OPTIONS } from "@/types/metric";
import { cn } from "@/lib/utils";
import { VALUE_MAX } from "@/lib/constants";

const inputClasses =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";
const inputErrorClasses =
  "border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500 dark:focus:border-red-500 dark:focus:ring-red-500";
const labelClasses =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

const VALUE_MIN = 0;
const submitButtonClasses =
  "w-full rounded-lg bg-factorial-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-factorial-accent-hover focus:outline-none focus:ring-2 focus:ring-factorial-accent focus:ring-offset-2 disabled:opacity-50 dark:bg-factorial-accent dark:hover:bg-factorial-accent-hover";

export interface ExistingMetricWithUnit {
  name: string;
  unit: string;
}

export interface MetricFormProps {
  /** Existing metric names for autocomplete suggestions (optional). Users can type any new name. */
  existingMetricNames?: string[];
  /** Existing metrics with units: when name matches, unit is locked to this metric's unit. */
  existingMetricsWithUnits?: ExistingMetricWithUnit[];
  /** Current form error message (for aria-describedby when present). */
  formError?: string;
  onSuccess?: (metric: Metric) => void;
  onError?: (message: string) => void;
  /** Called when user cancels (e.g. to close the modal). */
  onCancel?: () => void;
}

function getInitialTimestamp(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

/** Returns current date/time in YYYY-MM-DDTHH:mm for datetime-local max. */
function getMaxTimestamp(): string {
  const d = new Date();
  return d.toISOString().slice(0, 16);
}

/** Normalize API unit (e.g. lowercase) to form option (e.g. Count). */
function normalizeUnitToOption(unit: string): string {
  const u = (unit ?? "Count").trim().toLowerCase();
  const option = METRIC_UNIT_OPTIONS.find((o) => o.toLowerCase() === u);
  return option ?? "Count";
}

export function MetricForm({
  existingMetricNames = [],
  existingMetricsWithUnits = [],
  formError,
  onSuccess,
  onError,
  onCancel,
}: MetricFormProps) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [timestamp, setTimestamp] = useState(getInitialTimestamp);
  const [unit, setUnit] = useState<string>(METRIC_UNIT_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [maxTimestamp, setMaxTimestamp] = useState(getMaxTimestamp);

  const trimmedName = name.trim();
  const existingMetric = existingMetricsWithUnits.find(
    (m) => m.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  const unitLocked = Boolean(trimmedName && existingMetric);

  // When user selects or types an existing metric name, sync unit to that metric's unit
  useEffect(() => {
    if (existingMetric && existingMetric.unit != null) {
      setUnit(normalizeUnitToOption(existingMetric.unit));
    } else if (!trimmedName) {
      setUnit(METRIC_UNIT_OPTIONS[0]);
    }
  }, [trimmedName, existingMetric?.name, existingMetric?.unit]);

  // Keep max (current moment) updated so the time picker cannot select future times
  useEffect(() => {
    const t = setInterval(() => setMaxTimestamp(getMaxTimestamp()), 1000);
    return () => clearInterval(t);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const num = parseFloat(value);

    if (!trimmedName || Number.isNaN(num)) {
      onError?.("Metric name and a valid value are required.");
      return;
    }
    if (trimmedName.length > 50) {
      onError?.("Metric name must not exceed 50 characters.");
      return;
    }

    const timestampDate = new Date(timestamp);
    if (timestampDate.getTime() > Date.now()) {
      onError?.("Future dates and times are not permitted for historical metrics.");
      return;
    }

    setSubmitting(true);
    onError?.("");

    try {
      const created = await metricsService.createMetric({
        name: trimmedName,
        value: num,
        timestamp: new Date(timestamp).toISOString(),
        unit: unit || "Count",
      });
      setName("");
      setValue("");
      setTimestamp(getInitialTimestamp());
      setUnit(METRIC_UNIT_OPTIONS[0]);
      onSuccess?.(created);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Couldn't save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const nameValid = name.trim().length > 0 && name.trim().length <= 50;
  const valueNum = value.trim() === "" ? NaN : parseFloat(value);
  const valueValid =
    !Number.isNaN(valueNum) && valueNum >= VALUE_MIN && valueNum <= VALUE_MAX;
  const valueOutOfRange =
    value.trim() !== "" &&
    !Number.isNaN(valueNum) &&
    (valueNum < VALUE_MIN || valueNum > VALUE_MAX);
  const isFormValid = nameValid && valueValid;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2.5"
      aria-describedby={formError ? "metric-form-error" : undefined}
    >
      <div>
        <label htmlFor="metric-name" className={labelClasses}>
          Name
        </label>
        <input
          id="metric-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Website Visits"
          maxLength={50}
          list="metric-name-suggestions"
          className={cn(inputClasses, !nameValid && inputErrorClasses)}
          required
          aria-invalid={!nameValid && name.trim() !== ""}
        />
        {existingMetricNames.length > 0 && (
          <datalist id="metric-name-suggestions">
            {existingMetricNames.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        )}
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Max 50 characters.</p>
      </div>
      <div>
        <label htmlFor="metric-value" className={labelClasses}>
          Value
        </label>
        <input
          id="metric-value"
          type="number"
          step="any"
          min={VALUE_MIN}
          max={VALUE_MAX}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className={cn(inputClasses, !valueValid && inputErrorClasses)}
          required
          aria-invalid={!valueValid}
        />
        {value.trim() !== "" && !valueValid && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
            {valueOutOfRange
              ? "Value must be between 0 and 1,000,000,000."
              : "Enter a valid number."}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="metric-timestamp" className={labelClasses}>
          Date
        </label>
        <input
          id="metric-timestamp"
          type="datetime-local"
          value={timestamp}
          max={maxTimestamp}
          onChange={(e) => {
            const next = e.target.value;
            const max = getMaxTimestamp();
            if (next && max && next > max) {
              setTimestamp(max);
            } else {
              setTimestamp(next);
            }
          }}
          className={cn(
            inputClasses,
            "focus:border-factorial-accent focus:ring-factorial-accent focus:ring-1"
          )}
        />
      </div>
      <div>
        <span className={labelClasses}>Unit</span>
        {unitLocked && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400" role="status">
            Unit is locked for existing metrics to maintain data integrity.
          </p>
        )}
        <div
          className="mt-1.5 flex flex-wrap gap-2"
          role="group"
          aria-label="Metric unit"
          title={unitLocked ? "Unit is locked for existing metrics to maintain data integrity." : undefined}
        >
          {METRIC_UNIT_OPTIONS.map((opt) => {
            const isActive = unit === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => !unitLocked && setUnit(opt)}
                disabled={unitLocked}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-factorial-accent focus:ring-offset-2",
                  unitLocked && "cursor-not-allowed opacity-90",
                  isActive
                    ? "border-factorial-accent bg-factorial-accent/10 text-gray-900 dark:border-factorial-accent dark:bg-factorial-accent/20 dark:text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-gray-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800/80",
                  unitLocked && !isActive && "opacity-60"
                )}
                aria-pressed={isActive}
                aria-disabled={unitLocked}
              >
                {isActive && unitLocked && (
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                {isActive && !unitLocked && (
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-3 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-11 min-w-[7rem] rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !isFormValid}
          className={cn(submitButtonClasses, "h-11 py-2.5", onCancel && "w-full sm:w-auto sm:min-w-[8.5rem]")}
        >
          {submitting ? "Saving…" : "Add metric"}
        </button>
      </div>
    </form>
  );
}
