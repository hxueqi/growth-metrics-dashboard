"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSWRConfig } from "swr";
import { metricsService } from "@/services";
import { useMetrics } from "@/hooks/useMetrics";
import { useMetricNames } from "@/hooks/useMetricNames";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { useDownloadReport } from "@/hooks/useDownloadReport";
import { TIME_RANGE_PRESETS_MVP } from "@/lib/date";
import { CHART_COLORS } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { getDefaultMetricSelection } from "@/lib/metricSelection";
import { Skeleton } from "./ui/Skeleton";
import { ErrorBanner } from "./ui/ErrorBanner";
import { Modal } from "./ui/Modal";
import { ChartCard } from "./dashboard/ChartCard";
import { MetricSelector } from "./MetricSelector";
import { TimeRangeSelector } from "./TimeRangeSelector";
import { MetricsChart } from "./MetricsChart";
import { MetricForm } from "./MetricForm";

const SAMPLE_SUCCESS_DURATION_MS = 5000;

export function Dashboard() {
  const filters = useDashboardFilters();
  const {
    filters: { preset, dateRange, selectedMetricNames },
    setPreset,
    setDateRange,
    setSelectedMetricNames,
    currentParams,
  } = filters;

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sampleSuccessMessage, setSampleSuccessMessage] = useState<string | null>(null);
  const [sampleSkipMessage, setSampleSkipMessage] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isChartFullScreen, setIsChartFullScreen] = useState(false);
  const [sampleJustLoaded, setSampleJustLoaded] = useState(false);
  const reportSectionRef = useRef<HTMLDivElement>(null);
  const initialLoadDoneRef = useRef(false);

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
  }, [preset, selectedMetricNames]);

  const { mutate: mutateGlobal } = useSWRConfig();
  const { metrics, error, isLoading, revalidate } = useMetrics({ params: currentParams });
  const { names: metricOptions, rawMetrics, isLoading: isLoadingMetricNames, error: metricNamesError, revalidate: revalidateMetricNames } = useMetricNames();

  const showNoMetricsEmptyState = !rawMetrics?.length && !isLoadingMetricNames;

  useEffect(() => {
    if (isLoading || selectedMetricNames.length === 0) return;
    const safeMetrics = Array.isArray(metrics) ? metrics : [];
    if (safeMetrics.length === 0) {
      console.warn(
        "[Dashboard] Data mismatch: metrics selected but no data returned.",
        { selectedMetricNames, params: currentParams }
      );
    }
  }, [isLoading, selectedMetricNames, metrics, currentParams]);

  useEffect(() => {
    const list = Array.isArray(rawMetrics) ? rawMetrics : [];
    if (initialLoadDoneRef.current || list.length === 0) return;
    setSelectedMetricNames(getDefaultMetricSelection(list));
    initialLoadDoneRef.current = true;
  }, [rawMetrics, setSelectedMetricNames]);

  useEffect(() => {
    const list = Array.isArray(rawMetrics) ? rawMetrics : [];
    if (!sampleJustLoaded || list.length === 0) return;
    setSelectedMetricNames(getDefaultMetricSelection(list));
    setSampleJustLoaded(false);
  }, [sampleJustLoaded, rawMetrics, setSelectedMetricNames]);

  const onMetricCreated = useCallback(() => {
    revalidate();
    revalidateMetricNames();
    setRecordModalOpen(false);
    setFormError("");
  }, [revalidate, revalidateMetricNames]);

  const onRemoveMetric = useCallback(
    async (name: string) => {
      try {
        setRemoveError(null);
        await metricsService.deleteMetricByName(name);
        setSelectedMetricNames((prev) => prev.filter((n) => n !== name));
        await revalidateMetricNames();
        await revalidate();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not remove metric.";
        setRemoveError(`Could not remove "${name}". ${message}`);
        throw err;
      }
    },
    [revalidate, revalidateMetricNames, setSelectedMetricNames]
  );

  const handleGenerateSample = useCallback(async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setSampleSuccessMessage(null);
    setSampleSkipMessage(null);
    try {
      const result = await metricsService.createSampleMetrics();
      await revalidateMetricNames();
      mutateGlobal(
        (key) => Array.isArray(key) && key[0] === "/api/metrics",
        undefined,
        { revalidate: true }
      );
      if (result.skipped) {
        setSampleSkipMessage("Sample dataset already loaded. Change metric or time range to explore.");
      } else if (result.created > 0) {
        setSampleSuccessMessage("Sample dataset loaded. Explore the metrics below.");
        setSampleJustLoaded(true);
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
  }, [revalidateMetricNames, mutateGlobal]);

  const timeRangeLabel =
    TIME_RANGE_PRESETS_MVP.find((p) => p.value === (preset === "custom" ? "7d" : preset))?.label ??
    "Last 7 days";
  const metricLabel =
    selectedMetricNames.length === 0
      ? "Select metrics..."
      : selectedMetricNames.join(", ");

  const { download: downloadReport, isExporting: isExportingPdf, error: downloadError, clearError: clearDownloadError } = useDownloadReport(reportSectionRef, {
    title: "Growth Metrics Report",
    metricLabel,
    timeRangeLabel,
  });

  const chartTitle =
    selectedMetricNames.length === 0
      ? "Metric trends"
      : selectedMetricNames.length === 1
        ? `${selectedMetricNames[0]} Trends`
        : selectedMetricNames.length === 2
          ? `${selectedMetricNames[0]} & ${selectedMetricNames[1]} Trends`
          : `${selectedMetricNames[0]}, ${selectedMetricNames[1]} & ${selectedMetricNames.length - 2} more Trends`;

  const sectionCardClass = "rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-gray-800";

  return (
    <div className="min-h-screen bg-gray-100 px-8 pb-16 dark:bg-gray-950">
      <a
        href="#main-content"
        className="sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:m-0 focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none focus:[clip:auto] dark:focus:bg-gray-800 dark:focus:ring-offset-gray-900"
      >
        Skip to main content
      </a>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl space-y-3 pt-3">
        {/* Header Section — title + actions on one line */}
        <header className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 ${sectionCardClass}`}>
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
              {isGenerating ? "Loading…" : "Load Sample Dataset"}
            </button>
            <button
              type="button"
              onClick={downloadReport}
              disabled={isExportingPdf || (isLoading && metrics.length === 0)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 dark:border-slate-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {isExportingPdf ? "Preparing…" : "Download Report"}
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

        {/* Filter Section — slim light-gray bar with subtle border and shadow */}
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 shadow-sm dark:border-slate-600 dark:bg-slate-800/60 sm:px-6">
          <div className="min-w-0 flex-1 sm:min-w-[200px]">
            <MetricSelector
              rawMetrics={rawMetrics}
              value={selectedMetricNames}
              onChange={setSelectedMetricNames}
              onRemoveMetric={onRemoveMetric}
              placeholder="Search or select metrics..."
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
              onRetry={clearDownloadError}
              variant="error"
            />
          </div>
        )}
        {removeError && (
          <div className="mb-4">
            <ErrorBanner
              message={removeError}
              onRetry={() => setRemoveError(null)}
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
          {/* Chart — Bento card, fixed max-height; overflow-x-auto for narrow screens */}
          <ChartCard
            title={showNoMetricsEmptyState ? COPY.emptyNoMetricsTitle : chartTitle}
            titleTitle={showNoMetricsEmptyState ? COPY.emptyNoMetricsTitle : chartTitle}
            colorKeyItems={
              !showNoMetricsEmptyState && selectedMetricNames.length >= 2
                ? selectedMetricNames.map((name, i) => ({
                    name,
                    color: CHART_COLORS[i % CHART_COLORS.length],
                  }))
                : undefined
            }
            legendHint={!showNoMetricsEmptyState && selectedMetricNames.length > 1}
            onFullScreen={showNoMetricsEmptyState ? undefined : () => setIsChartFullScreen(true)}
            loading={isLoading && metrics.length > 0}
            noMetricsEmptyState={
              showNoMetricsEmptyState ? (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center dark:border-slate-600 dark:bg-slate-800/40">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {COPY.emptyNoMetricsCopy}
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateSample}
                    disabled={isGenerating}
                    className="rounded-lg bg-factorial-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-factorial-accent-hover focus:outline-none focus:ring-2 focus:ring-factorial-accent focus:ring-offset-2 disabled:opacity-50 dark:bg-factorial-accent dark:hover:bg-factorial-accent-hover"
                  >
                    {isGenerating ? "Loading…" : COPY.emptyNoMetricsCta}
                  </button>
                </div>
              ) : undefined
            }
          >
            {isLoading ? (
              <div
                className="h-full min-h-[550px] w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/40"
                aria-hidden
              >
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            ) : (
              <MetricsChart
                metrics={metrics}
                selectedName={undefined}
                timeRangePreset={preset === "custom" ? "7d" : preset}
                useDualYAxis={selectedMetricNames.length > 1}
                metricUnits={Object.fromEntries(rawMetrics.map((m) => [m.name, m.unit]))}
                containerClassName="h-full min-h-[550px]"
                emptyState={
                  selectedMetricNames.length === 0
                    ? {
                        primary: COPY.emptyChartSelectMetric,
                        secondary: COPY.emptyChartSelectMetricSecondary,
                      }
                    : metrics.length === 0
                      ? {
                          primary: COPY.emptyChartNoDataPrimary,
                          secondary: COPY.emptyChartNoDataSecondary,
                          primaryAction: {
                            label: COPY.emptyChartLoadSampleLabel,
                            onClick: handleGenerateSample,
                            loading: isGenerating,
                          },
                          secondaryAction: {
                            label: COPY.emptyChartAddDataLabel,
                            onClick: () => setRecordModalOpen(true),
                          },
                        }
                      : {
                          primary: COPY.emptyChartNoDataForRangePrimary,
                          secondary: COPY.emptyChartNoDataForRangeSecondary,
                        }
                }
              />
            )}
          </ChartCard>
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
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                {chartTitle}
              </h3>
              {selectedMetricNames.length > 1 && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Click a metric in the legend to show or hide it.
                </p>
              )}
            </div>
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
              selectedName={undefined}
              timeRangePreset={preset === "custom" ? "7d" : preset}
              useDualYAxis={selectedMetricNames.length > 1}
              metricUnits={Object.fromEntries(rawMetrics.map((m) => [m.name, m.unit]))}
              containerClassName="h-full min-h-[400px]"
emptyState={
                  selectedMetricNames.length === 0
                    ? {
                        primary: COPY.emptyChartSelectMetric,
                        secondary: COPY.emptyChartSelectMetricSecondary,
                      }
                  : metrics.length === 0
                    ? {
                        primary: COPY.emptyChartNoDataPrimary,
                        secondary: COPY.emptyChartNoDataSecondary,
                        primaryAction: {
                          label: COPY.emptyChartLoadSampleLabel,
                          onClick: handleGenerateSample,
                          loading: isGenerating,
                        },
                        secondaryAction: {
                          label: COPY.emptyChartAddDataLabel,
                          onClick: () => setRecordModalOpen(true),
                        },
                      }
                    : {
                        primary: COPY.emptyChartNoDataForRangePrimary,
                        secondary: COPY.emptyChartNoDataForRangeSecondary,
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
        contentClassName="pt-2 pb-3"
      >
        {formError && (
          <p id="metric-form-error" className="mb-2 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
            {formError}
          </p>
        )}
        {metricNamesError && (
          <p role="alert" className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-600 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
            Could not load metric list.{" "}
            <button
              type="button"
              onClick={() => revalidateMetricNames()}
              className="font-medium underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 rounded"
            >
              Retry
            </button>
          </p>
        )}
        <div className="pt-0">
        <MetricForm
          existingMetricNames={metricOptions}
          existingMetricsWithUnits={rawMetrics}
          formError={formError}
          onSuccess={onMetricCreated}
          onError={setFormError}
          onCancel={() => {
            setRecordModalOpen(false);
            setFormError("");
          }}
        />
        </div>
      </Modal>

    </div>
  );
}
