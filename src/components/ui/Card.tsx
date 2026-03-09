"use client";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/** Bento-style card: white, consistent radius, thin slate border. */
export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-600 dark:bg-gray-800",
        className
      )}
    >
      {children}
    </div>
  );
}
