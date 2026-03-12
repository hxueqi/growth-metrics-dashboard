import { NextRequest, NextResponse } from "next/server";
import { createMetric, getMetrics, deleteMetricsByName } from "@/lib/db/metrics";
import { isValidDateString } from "@/lib/date";
import { VALUE_MAX } from "@/lib/constants";

// --- Validation helpers ---

function parseQueryString(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed === "" ? undefined : trimmed;
}

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

/** POST body schema */
interface CreateMetricBody {
  name: string;
  value: number;
  timestamp: string;
  unit?: string;
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
  if (value < 0 || value > VALUE_MAX) {
    return { ok: false, status: 400, error: "Value exceeds permitted range." };
  }

  if (typeof timestamp !== "string" || timestamp.trim() === "") {
    return { ok: false, status: 400, error: "timestamp is required and must be a non-empty string." };
  }
  if (!isValidDateString(timestamp)) {
    return { ok: false, status: 400, error: "timestamp must be a valid ISO date string." };
  }

  const unit = normalizeUnit(b.unit);

  return {
    ok: true,
    data: {
      name: name.trim(),
      value,
      timestamp: timestamp.trim(),
      unit,
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
    const emptyParam = searchParams.get("empty") === "1";
    if (emptyParam) {
      return NextResponse.json([]);
    }
    const nameList = searchParams.getAll("name").map((s) => s?.trim()).filter(Boolean);
    const names = nameList.length > 0 ? nameList : undefined;
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
      names,
      startDate: startDateRaw ? new Date(startDateRaw) : undefined,
      endDate: endDateRaw ? new Date(endDateRaw) : undefined,
    });

    const serialized = metrics.map((m) => ({
      id: m.id,
      name: m.name,
      value: m.value ?? 0,
      unit: (m.unit ?? "Count").toString().toLowerCase(),
      timestamp: m.timestamp.toISOString(),
      createdAt: m.createdAt.toISOString(),
    }));
    return NextResponse.json(serialized);
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
 * Body: { name: string, value: number, timestamp: string, unit?: string }
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

    const { name, value, timestamp, unit } = validated.data;

    const metric = await createMetric({
      name,
      value,
      timestamp: new Date(timestamp),
      unit,
    });

    const serialized = {
      id: metric.id,
      name: metric.name,
      value: metric.value ?? 0,
      unit: (metric.unit ?? "Count").toString().toLowerCase(),
      timestamp: metric.timestamp.toISOString(),
      createdAt: metric.createdAt.toISOString(),
    };
    return NextResponse.json(serialized);
  } catch (error) {
    console.error("[POST /api/metrics]", error);
    return NextResponse.json(
      { error: "Failed to create metric." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/metrics?name=MetricName
 * Deletes all data points for the given metric name.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = parseQueryString(searchParams.get("name"));
    if (!name) {
      return NextResponse.json(
        { error: "Query parameter 'name' is required." },
        { status: 400 }
      );
    }
    if (name.length > 50) {
      return NextResponse.json(
        { error: "Metric name must not exceed 50 characters." },
        { status: 400 }
      );
    }
    const deleted = await deleteMetricsByName(name);
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("[DELETE /api/metrics]", error);
    return NextResponse.json(
      { error: "Failed to delete metric." },
      { status: 500 }
    );
  }
}
