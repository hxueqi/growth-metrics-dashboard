"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { metricsService } from "@/services";
import { useMetrics } from "@/hooks/useMetrics";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { EXAMPLE_METRIC_NAMES } from "@/lib/constants";
import { TIME_RANGE_PRESETS_MVP } from "@/lib/date";
import { Card } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";
import { ErrorBanner } from "./ui/ErrorBanner";
import { Modal } from "./ui/Modal";
import { MetricSelector } from "./MetricSelector";
import { TimeRangeSelector } from "./TimeRangeSelector";
import { MetricsChart } from "./MetricsChart";
import { MetricsSummary } from "./MetricSummary";
import { MetricForm } from "./MetricForm";

const SAMPLE_SUCCESS_DURATION_MS = 5000;

function getMetricOptions(metricNamesFromData: string[]): string[] {
  return [...new Set([...EXAMPLE_METRIC_NAMES, ...metricNamesFromData])].sort((a, b) =>
    a.localeCompare(b)
  );
}

export function Dashboard() {
  const filters = useDashboardFilters();
  const {
    filters: { preset, dateRange, metricSelection },
    setPreset,
    setDateRange,
    setMetricSelection,
    currentParams,
    previousParams,
  } = filters;

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sampleSuccessMessage, setSampleSuccessMessage] = useState<string | null>(null);
  const [sampleSkipMessage, setSampleSkipMessage] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isChartFullScreen, setIsChartFullScreen] = useState(false);
  const reportSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sampleSuccessMessage) return;
    const t = setTimeout(() => setSampleSuccessMessage(null), SAMPLE_SUCCESS_DURATION_MS);
    return () => clearTimeout(t);
  }, [sampleSuccessMessage]);

  useEffect(() => {
    if (!isChartFullScreen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsChartFullScreen(false);
    };
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [isChartFullScreen]);

  // Clear skip message when user changes filters (they’re exploring)
  useEffect(() => {
    setSampleSkipMessage(null);
  }, [preset, metricSelection.metricName]);

  const { metrics, error, isLoading, revalidate } = useMetrics({ params: currentParams });
  const { metrics: previousMetrics, revalidate: revalidatePrevious } = useMetrics({ params: previousParams });

  const metricOptions = getMetricOptions(metrics.map((m) => m.name));

  const onMetricCreated = useCallback(() => {
    revalidate();
    revalidatePrevious();
    setRecordModalOpen(false);
    setFormError("");
  }, [revalidate, revalidatePrevious]);

  const handleGenerateSample = useCallback(async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setSampleSuccessMessage(null);
    setSampleSkipMessage(null);
    try {
      const result = await metricsService.createSampleMetrics();
      await revalidate();
      await revalidatePrevious();
      if (result.skipped) {
        setSampleSkipMessage("Sample dataset already loaded. Change metric or time range to explore.");
      } else if (result.created > 0) {
        setSampleSuccessMessage("Sample dataset loaded. Explore the metrics below.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load sample dataset";
      const friendlyMessage =
        message === "Unauthorized." || message === "Forbidden."
          ? "Sample data is not available in this environment."
          : message;
      setGenerateError(friendlyMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [revalidate, revalidatePrevious]);

  const timeRangeLabel =
    TIME_RANGE_PRESETS_MVP.find((p) => p.value === (preset === "custom" ? "7d" : preset))?.label ??
    "Last 7 days";
  const metricLabel = metricSelection.metricName.trim() || "All metrics";

  const handleDownloadReport = useCallback(async () => {
    const el = reportSectionRef.current;
    if (!el) return;
    setDownloadError(null);
    setIsExportingPdf(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2 - 35;

      pdf.setFontSize(14);
      pdf.text("Growth Metrics Report", margin, 16);
      pdf.setFontSize(10);
      pdf.text(`Metric: ${metricLabel}`, margin, 24);
      pdf.text(`Time range: ${timeRangeLabel}`, margin, 30);
      pdf.text(`Exported: ${new Date().toLocaleString()}`, margin, 36);

      const imgW = canvas.width;
      const imgH = canvas.height;
      const aspect = imgH / imgW;
      let wMm = maxW;
      let hMm = maxW * aspect;
      if (hMm > maxH) {
        hMm = maxH;
        wMm = maxH / aspect;
      }
      pdf.addImage(imgData, "PNG", margin, 42, wMm, hMm);

      pdf.save(`growth-metrics-report-${Date.now()}.pdf`);
    } catch (err) {
      const isEvent = typeof err === "object" && err !== null && "type" in err && "target" in err;
      const message =
        err instanceof Error
          ? err.message
          : isEvent
            ? "Download was blocked or failed."
            : "Report download failed.";
      console.error("[Download report]", message, isEvent ? "(browser event)" : err);
      setDownloadError("Download failed. Try a smaller time range or another browser.");
    } finally {
      setIsExportingPdf(false);
    }
  }, [timeRangeLabel, metricLabel]);

  const bentoClass = "rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-gray-800";

  return (
    <div className="min-h-screen bg-gray-100 px-8 pb-16 dark:bg-gray-950">
      <a
        href="#main-content"
        className="sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:m-0 focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none focus:[clip:auto] dark:focus:bg-gray-800 dark:focus:ring-offset-gray-900"
      >
        Skip to main content
      </a>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl space-y-3 pt-3">
        {/* Header Section — title + actions on one line */}
        <header className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 ${bentoClass}`}>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Growth Metrics
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleGenerateSample}
              disabled={isGenerating}
              aria-label="Load sample acquisition and activation funnel for last 7 days"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 dark:border-slate-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {isGenerating ? "Loading…" : "Load sample dataset"}
            </button>
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={isExportingPdf || (isLoading && metrics.length === 0)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 dark:border-slate-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {isExportingPdf ? "Preparing…" : "Download report"}
            </button>
            <button
              type="button"
              onClick={() => setRecordModalOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={recordModalOpen}
              className="rounded-lg bg-factorial-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-factorial-accent-hover focus:outline-none focus:ring-2 focus:ring-factorial-accent focus:ring-offset-2 dark:bg-factorial-accent dark:hover:bg-factorial-accent-hover"
            >
              Add metric
            </button>
          </div>
        </header>

        {/* Filter Section — slim light-gray bar */}
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-600 dark:bg-slate-800/60 sm:px-6">
          <div className="min-w-0 flex-1 sm:min-w-[160px]">
            <MetricSelector
              metricOptions={metricOptions}
              variantOptions={[]}
              value={metricSelection}
              onChange={setMetricSelection}
              placeholder="All metrics"
            />
          </div>
          <div className="w-full min-w-0 sm:w-auto sm:flex-shrink-0">
            <TimeRangeSelector
              preset={preset === "custom" ? "7d" : preset}
              dateRange={dateRange}
              onPresetChange={setPreset}
              onDateRangeChange={setDateRange}
            />
          </div>
        </div>
        {generateError && (
          <div className="mb-4">
            <ErrorBanner message={generateError} variant="error" />
          </div>
        )}
        {downloadError && (
          <div className="mb-4">
            <ErrorBanner
              message={downloadError}
              onRetry={() => setDownloadError(null)}
              variant="error"
            />
          </div>
        )}

        {sampleSuccessMessage && (
          <div className="mb-4 rounded-xl border border-factorial-teal/30 bg-factorial-teal/10 p-4 dark:border-factorial-teal/40 dark:bg-factorial-teal/20">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {sampleSuccessMessage}
            </p>
          </div>
        )}

        {sampleSkipMessage && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {sampleSkipMessage}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6">
            <ErrorBanner
              message={`Failed to load metrics. ${error instanceof Error ? error.message : String(error)}`}
              onRetry={revalidate}
              variant="warning"
            />
          </div>
        )}

        <div
          ref={reportSectionRef}
          className="grid gap-3"
        >
          {/* Summary — Bento card, compact on desktop (1/5 of row space) */}
          <div
            className={`min-h-0 overflow-hidden px-4 pb-3 pt-2.5 sm:px-6 lg:pb-2.5 lg:pt-2.5 ${bentoClass}`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Summary
              </h2>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                |
              </span>
              <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
                {`${metricLabel} · ${timeRangeLabel}`}
              </p>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-600"
                  >
                    <Skeleton className="mb-2 h-3 w-20" />
                    <Skeleton className="h-7 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <MetricsSummary
                metrics={metrics}
                previousPeriodMetrics={previousMetrics}
                contextLabel={`${metricLabel} · ${timeRangeLabel}`}
                hideContextLabel
                allMetricsMode={metricSelection.metricName.trim() === ""}
              />
            )}
          </div>

          {/* Chart — Bento card, fixed max-height for above-the-fold layout; overflow-x-auto for narrow screens */}
          <Card className="flex flex-col overflow-x-auto p-0">
            <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-0 sm:px-5 lg:px-6">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Metrics over time
              </p>
              <div className="flex items-center gap-2">
                {isLoading && metrics.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-factorial-accent" />
                    Updating…
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsChartFullScreen(true)}
                  aria-label="Expand chart to full screen"
                  className="rounded p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="min-h-[300px] min-w-0 max-h-[320px] aspect-[16/7] w-full px-4 pb-3 pt-2 sm:min-h-0 sm:px-5 sm:pb-4 sm:pt-2.5 lg:px-6 lg:pb-4 lg:pt-3">
              {isLoading ? (
                <div
                  className="h-full w-full min-h-[300px] rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/40 sm:min-h-[180px]"
                  aria-hidden
                >
                  <Skeleton className="h-full w-full rounded-xl" />
                </div>
              ) : (
                <MetricsChart
                  metrics={metrics}
                  selectedName={metricSelection.metricName.trim() || undefined}
                  timeRangePreset={preset === "custom" ? "7d" : preset}
                  useDualYAxis={metricSelection.metricName.trim() === ""}
                  containerClassName="h-full min-h-[300px] max-h-[320px] aspect-[16/7] sm:min-h-[180px]"
                  emptyState={
                    metrics.length === 0
                      ? {
                          primary: "No data in this time range",
                          secondary:
                            "Add a metric or load the sample dataset to explore the funnel.",
                          primaryAction: {
                            label: "Load sample dataset",
                            onClick: handleGenerateSample,
                            loading: isGenerating,
                          },
                          secondaryAction: {
                            label: "Add metric",
                            onClick: () => setRecordModalOpen(true),
                          },
                        }
                      : {
                          primary: "No data for this metric in the selected range",
                          secondary:
                            "Try a different metric or time range.",
                        }
                  }
                />
              )}
            </div>
          </Card>
        </div>
      </main>

      {/* Chart full-screen overlay */}
      {isChartFullScreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900"
          role="dialog"
          aria-modal="true"
          aria-label="Chart full screen"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Metrics over time
            </p>
            <button
              type="button"
              onClick={() => setIsChartFullScreen(false)}
              aria-label="Close full screen"
              className="rounded p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="min-h-0 flex-1 p-4">
            <MetricsChart
              metrics={metrics}
              selectedName={metricSelection.metricName.trim() || undefined}
              timeRangePreset={preset === "custom" ? "7d" : preset}
              useDualYAxis={metricSelection.metricName.trim() === ""}
              containerClassName="h-full min-h-[400px]"
              emptyState={
                metrics.length === 0
                  ? {
                      primary: "No data in this time range",
                      secondary: "Add a metric or load the sample dataset to explore the funnel.",
                      primaryAction: {
                        label: "Load sample dataset",
                        onClick: handleGenerateSample,
                        loading: isGenerating,
                      },
                      secondaryAction: {
                        label: "Add metric",
                        onClick: () => setRecordModalOpen(true),
                      },
                    }
                  : {
                      primary: "No data for this metric in the selected range",
                      secondary: "Try a different metric or time range.",
                    }
              }
            />
          </div>
        </div>
      )}

      {/* Add metric modal */}
      <Modal
        open={recordModalOpen}
        onClose={() => {
          setRecordModalOpen(false);
          setFormError("");
        }}
        title="Add metric"
      >
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Create a new metric entry.
        </p>
        {formError && (
          <p id="metric-form-error" className="mb-3 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
            {formError}
          </p>
        )}
        <MetricForm
          metricOptions={metricOptions.length > 0 ? metricOptions : [...EXAMPLE_METRIC_NAMES]}
          formError={formError}
          onSuccess={onMetricCreated}
          onError={setFormError}
          onCancel={() => {
            setRecordModalOpen(false);
            setFormError("");
          }}
        />
      </Modal>
    </div>
  );
}
