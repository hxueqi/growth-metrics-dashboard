import { NextResponse } from "next/server";
import { getDistinctMetricNamesWithUnits } from "@/lib/db/metrics";

/**
 * GET /api/metrics/names
 * Returns distinct metric names with unit (sorted A–Z). metrics: { name, unit }[]; names: string[].
 */
export async function GET() {
  try {
    const rows = await getDistinctMetricNamesWithUnits();
    const metrics = rows.map((m) => ({
      name: m.name,
      unit: (m.unit ?? "Count").toString().toLowerCase(),
    }));
    const names = rows.map((m) => m.name);
    return NextResponse.json({ metrics, names });
  } catch (error) {
    console.error("[GET /api/metrics/names]", error);
    return NextResponse.json(
      { error: "Failed to fetch metric names." },
      { status: 500 }
    );
  }
}
