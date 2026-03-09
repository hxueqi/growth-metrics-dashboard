"use client";

import { useState, useEffect } from "react";
import { metricsService } from "@/services";
import type { Metric } from "@/types/metric";
import { cn } from "@/lib/utils";

const inputClasses =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";
const inputErrorClasses =
  "border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500 dark:focus:border-red-500 dark:focus:ring-red-500";
const labelClasses =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

const VALUE_MIN = 0;
const VALUE_MAX = 1_000_000_000;
const submitButtonClasses =
  "w-full rounded-lg bg-factorial-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-factorial-accent-hover focus:outline-none focus:ring-2 focus:ring-factorial-accent focus:ring-offset-2 disabled:opacity-50 dark:bg-factorial-accent dark:hover:bg-factorial-accent-hover";

export interface MetricFormProps {
  /** Metric name options for the dropdown (e.g. from dashboard). */
  metricOptions: string[];
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

export function MetricForm({ metricOptions, formError, onSuccess, onError, onCancel }: MetricFormProps) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [timestamp, setTimestamp] = useState(getInitialTimestamp);
  const [submitting, setSubmitting] = useState(false);
  const [maxTimestamp, setMaxTimestamp] = useState(getMaxTimestamp);

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
      onError?.("Metric and a valid value are required.");
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
      });
      setName("");
      setValue("");
      setTimestamp(getInitialTimestamp());
      onSuccess?.(created);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Couldn't save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const metricSelected = name.trim() !== "";
  const valueNum = value.trim() === "" ? NaN : parseFloat(value);
  const valueValid =
    !Number.isNaN(valueNum) && valueNum >= VALUE_MIN && valueNum <= VALUE_MAX;
  const valueOutOfRange =
    value.trim() !== "" &&
    !Number.isNaN(valueNum) &&
    (valueNum < VALUE_MIN || valueNum > VALUE_MAX);
  const isFormValid = metricSelected && valueValid;

  const selectClass = cn(inputClasses);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3"
      aria-describedby={formError ? "metric-form-error" : undefined}
    >
      <div>
        <label htmlFor="metric-name" className={labelClasses}>
          Metric
        </label>
        <select
          id="metric-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(selectClass, !metricSelected && inputErrorClasses)}
          required
          aria-invalid={!metricSelected}
        >
          <option value="">Select a metric</option>
          {metricOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Choose from the list to keep metric names consistent (max 50 characters).
        </p>
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
      <div className="mb-5">
        <label htmlFor="metric-timestamp" className={labelClasses}>
          Timestamp
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
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Future dates and times are not permitted for historical metrics.
        </p>
      </div>
      <div className="mt-4 flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
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
          {submitting ? "Adding…" : "Add metric"}
        </button>
      </div>
    </form>
  );
}
