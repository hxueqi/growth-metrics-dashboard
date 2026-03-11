import { NextRequest, NextResponse } from "next/server";
import { createMetricsBatch } from "@/lib/db/metrics";
import { isValidDateString } from "@/lib/date";
import { VALUE_MAX, BATCH_METRICS_LIMIT } from "@/lib/constants";

const METRIC_UNITS = ["Count", "Percentage", "Currency", "Seconds"] as const;
const UNIT_ALIASES: Record<string, (typeof METRIC_UNITS)[number]> = {
  count: "Count",
  percentage: "Percentage",
  currency: "Currency",
  seconds: "Seconds",
};

function normalizeUnit(raw: unknown): (typeof METRIC_UNITS)[number] {
  if (typeof raw !== "string" || !raw.trim()) return "Count";
  const key = raw.trim().toLowerCase();
  return UNIT_ALIASES[key] ?? (METRIC_UNITS.includes(raw.trim() as (typeof METRIC_UNITS)[number]) ? (raw.trim() as (typeof METRIC_UNITS)[number]) : "Count");
}

function optionalString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

/** Validate a single metric object. Returns validated data or error. */
function validateOne(
  item: unknown,
  index: number
): { ok: true; data: { name: string; value: number; timestamp: Date; unit: string; variant: string | null; country: string | null; device: string | null; segment: string | null } } | { ok: false; error: string } {
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    return { ok: false, error: `metrics[${index}]: must be an object.` };
  }
  const b = item as Record<string, unknown>;
  const { name, value, timestamp } = b;

  if (typeof name !== "string" || name.trim() === "") {
    return { ok: false, error: `metrics[${index}]: name is required and must be a non-empty string.` };
  }
  if (name.trim().length > 50) {
    return { ok: false, error: `metrics[${index}]: name must not exceed 50 characters.` };
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, error: `metrics[${index}]: value is required and must be a finite number.` };
  }
  if (value < 0 || value > VALUE_MAX) {
    return { ok: false, error: `metrics[${index}]: value exceeds permitted range.` };
  }
  if (typeof timestamp !== "string" || timestamp.trim() === "") {
    return { ok: false, error: `metrics[${index}]: timestamp is required and must be a non-empty string.` };
  }
  if (!isValidDateString(timestamp)) {
    return { ok: false, error: `metrics[${index}]: timestamp must be a valid ISO date string.` };
  }
  for (const key of ["variant", "country", "device", "segment"] as const) {
    const val = b[key];
    if (val !== undefined && val !== null && typeof val !== "string") {
      return { ok: false, error: `metrics[${index}]: ${key} must be a string when provided.` };
    }
  }

  const unit = normalizeUnit(b.unit);
  return {
    ok: true,
    data: {
      name: name.trim(),
      value,
      timestamp: new Date(timestamp.trim()),
      unit,
      variant: optionalString(b.variant) ?? null,
      country: optionalString(b.country) ?? null,
      device: optionalString(b.device) ?? null,
      segment: optionalString(b.segment) ?? null,
    },
  };
}

/**
 * POST /api/metrics/batch
 * Body: { metrics: Array<{ name, value, timestamp; optional: unit, variant, country, device, segment }> }
 * Inserts all metrics in a single query. Returns { count }.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Body must be a JSON object with a 'metrics' array." },
        { status: 400 }
      );
    }

    const raw = (body as Record<string, unknown>).metrics;
    if (!Array.isArray(raw)) {
      return NextResponse.json(
        { error: "Body must contain 'metrics' as an array." },
        { status: 400 }
      );
    }

    if (raw.length > BATCH_METRICS_LIMIT) {
      return NextResponse.json(
        { error: `metrics array must not exceed ${BATCH_METRICS_LIMIT} items.` },
        { status: 400 }
      );
    }

    const validated: { name: string; value: number; timestamp: Date; unit: string; variant: string | null; country: string | null; device: string | null; segment: string | null }[] = [];
    for (let i = 0; i < raw.length; i++) {
      const result = validateOne(raw[i], i);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      validated.push(result.data);
    }

    const { count } = await createMetricsBatch(validated);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("[POST /api/metrics/batch]", error);
    return NextResponse.json(
      { error: "Failed to create metrics." },
      { status: 500 }
    );
  }
}
