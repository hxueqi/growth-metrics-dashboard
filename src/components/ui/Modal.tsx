"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusables(container: HTMLElement): HTMLElement[] {
  const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(nodes).filter((el) => !el.hasAttribute("disabled") && el.offsetParent != null);
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Simple modal: overlay + centered panel. Closes on overlay click or Escape.
 * Moves focus into the dialog when opened and traps focus until closed.
 */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = getFocusables(panel);
      if (focusables.length === 0) return;

      if (e.key === "Tab") {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const current = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (current === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (current === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    const focusPanel = () => {
      const panel = panelRef.current;
      if (panel) {
        const focusables = getFocusables(panel);
        if (focusables.length > 0) focusables[0].focus();
      }
    };
    const t = setTimeout(focusPanel, 0);

    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-gray-900/40 dark:bg-gray-950/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className={cn(
          "relative flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 dark:border-slate-700 sm:px-5 sm:py-4">
          <h2 id="modal-title" className="min-w-0 truncate text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:text-slate-400 dark:hover:bg-gray-700 dark:hover:text-slate-300"
          >
            <span aria-hidden="true" className="text-[18px] leading-none">×</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
