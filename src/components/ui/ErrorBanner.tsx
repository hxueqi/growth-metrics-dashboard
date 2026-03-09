"use client";

import { cn } from "@/lib/utils";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  variant?: "warning" | "error";
  className?: string;
}

const variantClasses = {
  warning:
    "border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200",
  error:
    "border-red-200 bg-red-50/80 text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-200",
};

const retryButtonClasses = {
  warning:
    "rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/30",
  error:
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
};

/** Dismissible error/warning banner with optional retry. */
export function ErrorBanner({
  message,
  onRetry,
  variant = "warning",
  className,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border p-4",
        variantClasses[variant],
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              "shrink-0 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
              retryButtonClasses[variant]
            )}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
