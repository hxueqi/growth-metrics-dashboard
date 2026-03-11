import { NextResponse } from "next/server";
import { getExactDaysRange } from "@/lib/date";
import { SAMPLE_DAYS } from "@/lib/constants";
import {
  deleteMetricsByName,
  deleteMetricsByNamesAndDateRange,
  createMetricsBatch,
} from "@/lib/db/metrics";
import {
  generateSampleMetrics,
  getSampleMetricNamesToClear,
  NAMES_TO_FULLY_REMOVE_ON_SAMPLE_LOAD,
} from "@/lib/sampleMetrics";

/**
 * POST /api/load-sample
 *
 * Server-only "Load sample dataset": clears sample data and inserts 90 days of demo metrics.
 * - In production: allowed only when RESET_SAMPLE_SECRET is set (no client secret needed).
 * - In development: always allowed.
 *
 * Returns { created: number }. Use this from the UI so the button works in production
 * without exposing any secret to the browser.
 */
export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      if (!process.env.RESET_SAMPLE_SECRET) {
        return NextResponse.json(
          { error: "Forbidden." },
          { status: 403 }
        );
      }
    }

    const { startDate: rangeStart, endDate: rangeEnd } = getExactDaysRange(SAMPLE_DAYS);
    const startDate = new Date(rangeStart);
    const endDate = new Date(rangeEnd);

    for (const name of NAMES_TO_FULLY_REMOVE_ON_SAMPLE_LOAD) {
      await deleteMetricsByName(name);
    }

    const namesToClear = getSampleMetricNamesToClear();
    await deleteMetricsByNamesAndDateRange(namesToClear, startDate, endDate);

    const payloads = generateSampleMetrics();
    const batchData = payloads.map((p) => ({
      name: p.name,
      value: p.value,
      timestamp: new Date(p.timestamp),
      unit: p.unit ?? "Count",
      variant: p.variant ?? null,
      country: p.country ?? null,
      device: p.device ?? null,
      segment: p.segment ?? null,
    }));

    const { count } = await createMetricsBatch(batchData);
    return NextResponse.json({ created: count });
  } catch (error) {
    console.error("[POST /api/load-sample]", error);
    return NextResponse.json(
      { error: "Failed to load sample dataset." },
      { status: 500 }
    );
  }
}
