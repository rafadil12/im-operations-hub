import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { jsonError } from "@/lib/report/apiHelpers";
import { computeReportOverviewMetrics } from "@/lib/report/overviewMetrics";
import {
  loadReportAreas,
  loadReportLinesForOverview,
  loadReportSubmissions,
} from "@/lib/report/lineStore";
import { parseYear } from "@/lib/report/apiHelpers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.reportOverviewView,
    PERMISSIONS.reportLineRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const year = parseYear(searchParams.get("year")) ?? new Date().getFullYear();

    const [areas, rows, submissions] = await Promise.all([
      loadReportAreas(),
      loadReportLinesForOverview(year),
      loadReportSubmissions({ year }),
    ]);

    const metrics = computeReportOverviewMetrics({
      year,
      areas,
      rows,
      submissions,
    });

    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error("GET /api/report/overview ERROR:", error);
    return jsonError("Failed to load report overview.", 500);
  }
}
