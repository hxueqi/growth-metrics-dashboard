"use client";

import { Card } from "@/components/ui/Card";

export interface ChartCardProps {
  /** Main heading in the card header */
  title: string;
  /** Optional accessibility title (e.g. for tooltip); defaults to title */
  titleTitle?: string;
  /** Inline color key: dot + label per metric (e.g. first 3 + "+N more") */
  colorKeyItems?: { name: string; color: string }[];
  /** Show "Click a metric in the legend to show or hide it." */
  legendHint?: boolean;
  /** Called when fullscreen button is clicked; presence shows the button */
  onFullScreen?: () => void;
  /** Show "Updating…" indicator next to fullscreen when true */
  loading?: boolean;
  /** When set, body shows this instead of children (e.g. no-metrics empty state) */
  noMetricsEmptyState?: React.ReactNode;
  /** Main body when noMetricsEmptyState is not used (chart, skeleton, etc.) */
  children: React.ReactNode;
}

/**
 * Reusable chart card: header (title, optional color key, legend hint, fullscreen)
 * and body (custom empty state or children). Keeps Dashboard layout consistent.
 */
export function ChartCard({
  title,
  titleTitle,
  colorKeyItems,
  legendHint,
  onFullScreen,
  loading = false,
  noMetricsEmptyState,
  children,
}: ChartCardProps) {
  const displayTitle = titleTitle ?? title;
  const showColorKey = colorKeyItems && colorKeyItems.length > 0;
  const showMoreCount = showColorKey && colorKeyItems!.length > 3;

  return (
    <Card className="flex flex-col overflow-x-auto p-0">
      <div className="flex items-center justify-between gap-2 px-8 pt-4 pb-0">
        <div className="min-w-0 flex-1">
          <h3
            className="break-words text-base font-semibold text-gray-900 dark:text-white sm:text-lg"
            title={displayTitle}
          >
            {title}
          </h3>
          {showColorKey && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {colorKeyItems!.slice(0, 3).map(({ name, color }) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
                  title={name}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <span className="max-w-[120px] truncate sm:max-w-[140px]">{name}</span>
                </span>
              ))}
              {showMoreCount && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  +{colorKeyItems!.length - 3} more
                </span>
              )}
            </div>
          )}
          {legendHint && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Click a metric in the legend to show or hide it.
            </p>
          )}
        </div>
        {onFullScreen != null && (
          <div className="flex items-center gap-2">
            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-factorial-accent" />
                Updating…
              </div>
            )}
            <button
              type="button"
              onClick={onFullScreen}
              aria-label="Expand chart to full screen"
              className="rounded p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="min-h-[614px] min-w-0 w-full p-8">
        {noMetricsEmptyState ?? children}
      </div>
    </Card>
  );
}
