"use client";

import { useCallback, useState, type RefObject } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export interface UseDownloadReportMetadata {
  title: string;
  metricLabel: string;
  timeRangeLabel: string;
}

export interface UseDownloadReportReturn {
  download: () => void;
  isExporting: boolean;
  error: string | null;
  clearError: () => void;
}

const PDF_MARGIN_MM = 14;
const PDF_HEADER_HEIGHT_MM = 35;

/**
 * Hook to export a DOM section as a PDF report (html2canvas + jsPDF).
 * Captures sectionRef, adds metadata text, and triggers download.
 */
export function useDownloadReport(
  sectionRef: RefObject<HTMLDivElement | null>,
  metadata: UseDownloadReportMetadata
): UseDownloadReportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const download = useCallback(async () => {
    const el = sectionRef.current;
    if (!el) return;

    setError(null);
    setIsExporting(true);

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
      const maxW = pageW - PDF_MARGIN_MM * 2;
      const maxH = pageH - PDF_MARGIN_MM * 2 - PDF_HEADER_HEIGHT_MM;

      pdf.setFontSize(14);
      pdf.text(metadata.title, PDF_MARGIN_MM, 16);
      pdf.setFontSize(10);
      pdf.text(`Metric: ${metadata.metricLabel}`, PDF_MARGIN_MM, 24);
      pdf.text(`Time range: ${metadata.timeRangeLabel}`, PDF_MARGIN_MM, 30);
      pdf.text(`Exported: ${new Date().toLocaleString()}`, PDF_MARGIN_MM, 36);

      const imgW = canvas.width;
      const imgH = canvas.height;
      const aspect = imgH / imgW;
      let wMm = maxW;
      let hMm = maxW * aspect;
      if (hMm > maxH) {
        hMm = maxH;
        wMm = maxH / aspect;
      }
      pdf.addImage(imgData, "PNG", PDF_MARGIN_MM, 42, wMm, hMm);

      const filename = `${metadata.title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`;
      pdf.save(filename);
    } catch (err) {
      const isEvent =
        typeof err === "object" && err !== null && "type" in err && "target" in err;
      const message =
        err instanceof Error
          ? err.message
          : isEvent
            ? "Download was blocked or failed."
            : "Report download failed.";
      console.error("[Download report]", message, isEvent ? "(browser event)" : err);
      setError("Download failed. Try a smaller time range or another browser.");
    } finally {
      setIsExporting(false);
    }
  }, [sectionRef, metadata.title, metadata.metricLabel, metadata.timeRangeLabel]);

  return { download, isExporting, error, clearError };
}
