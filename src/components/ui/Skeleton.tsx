"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/** Subtle gray pulse placeholder for loading states. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-gray-200 dark:bg-gray-700",
        className
      )}
      aria-hidden
    />
  );
}
