/**
 * Simple class name merger for Tailwind (optional clsx/twMerge can be added later).
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
