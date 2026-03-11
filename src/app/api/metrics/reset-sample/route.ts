import { NextRequest, NextResponse } from "next/server";
import { deleteMetricsByNamesAndDateRange } from "@/lib/db/metrics";
import { getSampleMetricNamesToClear } from "@/lib/sampleMetrics";
import { isValidDateString } from "@/lib/date";
import { SAMPLE_DAYS } from "@/lib/constants";

const RESET_SAMPLE_SECRET = process.env.RESET_SAMPLE_SECRET;

/**
 * POST /api/metrics/reset-sample
 * Body: { startDate: string (ISO), endDate: string (ISO) }
 * Deletes all sample-named metrics in the given date range.
 * - In production: disabled unless RESET_SAMPLE_SECRET is set; when set, require x-internal-key header.
 * - In development: allowed without header when RESET_SAMPLE_SECRET is unset.
 */
export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      if (!RESET_SAMPLE_SECRET) {
        return NextResponse.json(
          { error: "Forbidden." },
          { status: 403 }
        );
      }
      const key = request.headers.get("x-internal-key");
      if (key !== RESET_SAMPLE_SECRET) {
        return NextResponse.json(
          { error: "Unauthorized." },
          { status: 401 }
        );
      }
    } else if (RESET_SAMPLE_SECRET) {
      const key = request.headers.get("x-internal-key");
      if (key !== RESET_SAMPLE_SECRET) {
        return NextResponse.json(
          { error: "Unauthorized." },
          { status: 401 }
        );
      }
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    if (body == null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Body must be a JSON object with startDate and endDate." }, { status: 400 });
    }

    const { startDate: startDateRaw, endDate: endDateRaw } = body as Record<string, unknown>;
    if (typeof startDateRaw !== "string" || typeof endDateRaw !== "string") {
      return NextResponse.json({ error: "startDate and endDate are required ISO date strings." }, { status: 400 });
    }
    if (!isValidDateString(startDateRaw) || !isValidDateString(endDateRaw)) {
      return NextResponse.json({ error: "startDate and endDate must be valid ISO date strings." }, { status: 400 });
    }

    const startMs = new Date(startDateRaw).getTime();
    const endMs = new Date(endDateRaw).getTime();
    const maxRangeMs = (SAMPLE_DAYS + 1) * 24 * 60 * 60 * 1000;
    if (endMs - startMs >= maxRangeMs) {
      return NextResponse.json(
        { error: "Date range must not exceed 90 days." },
        { status: 400 }
      );
    }

    const names = getSampleMetricNamesToClear();
    const deleted = await deleteMetricsByNamesAndDateRange(
      names,
      new Date(startDateRaw),
      new Date(endDateRaw)
    );

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("[POST /api/metrics/reset-sample]", error);
    return NextResponse.json({ error: "Failed to reset sample metrics." }, { status: 500 });
  }
}
