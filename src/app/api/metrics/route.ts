import { NextRequest, NextResponse } from "next/server";
import { createMetric, getMetrics } from "@/lib/db/metrics";
import { isValidDateString } from "@/lib/date";

// --- Validation helpers ---

function parseQueryString(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** POST body schema */
interface CreateMetricBody {
  name: string;
  value: number;
  timestamp: string;
  variant?: string;
  country?: string;
  device?: string;
  segment?: string;
}

function optionalString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function validateCreateBody(body: unknown): { ok: true; data: CreateMetricBody } | { ok: false; status: number; error: string } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "Body must be a JSON object." };
  }

  const b = body as Record<string, unknown>;
  const { name, value, timestamp } = b;

  if (typeof name !== "string" || name.trim() === "") {
    return { ok: false, status: 400, error: "name is required and must be a non-empty string." };
  }
  if (name.trim().length > 50) {
    return { ok: false, status: 400, error: "name must not exceed 50 characters." };
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, status: 400, error: "value is required and must be a finite number." };
  }
  if (value < 0 || value > 1_000_000_000) {
    return { ok: false, status: 400, error: "Value exceeds permitted range." };
  }

  if (typeof timestamp !== "string" || timestamp.trim() === "") {
    return { ok: false, status: 400, error: "timestamp is required and must be a non-empty string." };
  }
  if (!isValidDateString(timestamp)) {
    return { ok: false, status: 400, error: "timestamp must be a valid ISO date string." };
  }

  for (const key of ["variant", "country", "device", "segment"] as const) {
    const val = b[key];
    if (val !== undefined && val !== null && typeof val !== "string") {
      return { ok: false, status: 400, error: `${key} must be a string when provided.` };
    }
  }

  return {
    ok: true,
    data: {
      name: name.trim(),
      value,
      timestamp: timestamp.trim(),
      variant: optionalString(b.variant),
      country: optionalString(b.country),
      device: optionalString(b.device),
      segment: optionalString(b.segment),
    },
  };
}

/**
 * GET /api/metrics
 * Query params: name (optional), startDate (optional), endDate (optional).
 * Returns metrics sorted by timestamp ascending.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = parseQueryString(searchParams.get("name"));
    const startDateRaw = parseQueryString(searchParams.get("startDate"));
    const endDateRaw = parseQueryString(searchParams.get("endDate"));

    if (startDateRaw !== undefined && !isValidDateString(startDateRaw)) {
      return NextResponse.json(
        { error: "startDate must be a valid ISO date string." },
        { status: 400 }
      );
    }
    if (endDateRaw !== undefined && !isValidDateString(endDateRaw)) {
      return NextResponse.json(
        { error: "endDate must be a valid ISO date string." },
        { status: 400 }
      );
    }

    const metrics = await getMetrics({
      name,
      startDate: startDateRaw ? new Date(startDateRaw) : undefined,
      endDate: endDateRaw ? new Date(endDateRaw) : undefined,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("[GET /api/metrics]", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/metrics
 * Body: { name: string, value: number, timestamp: string, variant?: string }
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

    const validated = validateCreateBody(body);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error },
        { status: validated.status }
      );
    }

    const { name, value, timestamp, variant, country, device, segment } = validated.data;

    const metric = await createMetric({
      name,
      value,
      timestamp: new Date(timestamp),
      variant: variant ?? null,
      country: country ?? null,
      device: device ?? null,
      segment: segment ?? null,
    });

    return NextResponse.json(metric);
  } catch (error) {
    console.error("[POST /api/metrics]", error);
    return NextResponse.json(
      { error: "Failed to create metric." },
      { status: 500 }
    );
  }
}
