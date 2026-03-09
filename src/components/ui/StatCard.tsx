"use client";

import { cn } from "@/lib/utils";

export type StatCardVariant = "default" | "positive" | "negative";

interface StatCardProps {
  label: string;
  value: string | number | React.ReactNode;
  /** Secondary label under the main label (e.g. "Per day"). */
  subLabel?: string;
  /** Small secondary line under the primary value (e.g. metric name under growth %). */
  valueSubLabel?: string;
  /** Visual variant: default = volume (faint blue), positive/negative = growth (faint green/red). */
  variant?: StatCardVariant;
  /** For trend cards: 'badge' = colored badge, 'muted' = muted small text. Default 'badge'. */
  labelStyle?: "badge" | "muted";
  className?: string;
}

/** KPI card: top label or badge, primary value (hero), optional value sub-label. Compact list-style under 400px. */
export function StatCard({ label, value, subLabel, valueSubLabel, variant = "default", labelStyle = "badge", className }: StatCardProps) {
  const isTrend = variant === "positive" || variant === "negative";
  const useMutedLabel = isTrend && labelStyle === "muted";

  const labelEl = useMutedLabel ? (
    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
      {label}
    </p>
  ) : isTrend ? (
    <span
      className={cn(
        "inline-block max-w-full rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide break-words leading-none",
        variant === "positive" &&
          "bg-emerald-200/70 text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-200",
        variant === "negative" &&
          "bg-red-200/70 text-red-800 dark:bg-red-800/40 dark:text-red-200"
      )}
    >
      {label}
    </span>
  ) : (
    <div className="flex min-w-0 items-baseline gap-2">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 break-words min-w-0">
        {label}
      </p>
      {subLabel && (
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {subLabel}
        </span>
      )}
    </div>
  );

  const valueEl = (
    <p
      className={cn(
        "text-xl font-extrabold tabular-nums break-words min-w-0 leading-tight",
        !isTrend && "text-slate-900 dark:text-white",
        variant === "positive" && "text-emerald-800 dark:text-emerald-200",
        variant === "negative" && "text-red-800 dark:text-red-200"
      )}
    >
      {value}
    </p>
  );

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all duration-200 overflow-hidden min-w-0",
        "hover:shadow-sm hover:-translate-y-px",
        "max-[400px]:flex max-[400px]:flex-row max-[400px]:items-center max-[400px]:justify-between max-[400px]:gap-3 max-[400px]:py-3",
        variant === "default" &&
          "border-slate-200 bg-blue-50/50 dark:border-slate-600 dark:bg-blue-950/20 hover:border-slate-300 dark:hover:border-slate-500",
        variant === "positive" &&
          "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/25 hover:border-emerald-300 dark:hover:border-emerald-700/50",
        variant === "negative" &&
          "border-red-200/80 bg-red-50/40 dark:border-red-900/30 dark:bg-red-950/20 hover:border-red-300 dark:hover:border-red-800/50",
        className
      )}
    >
      {/* Desktop: stacked layout; mobile (<400px): list row */}
      <div className="max-[400px]:min-w-0 max-[400px]:flex-1">
        {labelEl}
        <div className="min-[401px]:mt-1.5 max-[400px]:hidden">
          {valueEl}
        </div>
        {valueSubLabel && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 break-words min-w-0 min-[401px]:block max-[400px]:hidden">
            {valueSubLabel}
          </p>
        )}
      </div>
      {/* Mobile list: value on the right */}
      <div className="hidden max-[400px]:block max-[400px]:shrink-0 max-[400px]:text-right">
        {valueEl}
      </div>
    </div>
  );
}
