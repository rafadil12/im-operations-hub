import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { jsonError, parseWeekNumber, parseYear } from "@/lib/report/apiHelpers";
import { computeReportOverviewMetrics } from "@/lib/report/overviewMetrics";
import {
  loadReportAreas,
  loadReportLinesForOverview,
  loadReportSubmissions,
  loadReportWeeks,
} from "@/lib/report/lineStore";
import { getWeekNumberForDate } from "@/lib/report/weekCalendar";

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
    const weekNumber =
      parseWeekNumber(searchParams.get("week")) ?? getWeekNumberForDate(new Date());

    const [areas, rows, submissions, weeks] = await Promise.all([
      loadReportAreas(),
      loadReportLinesForOverview(year),
      loadReportSubmissions({ year }),
      loadReportWeeks(year),
    ]);

    const selectedWeek = weeks.find((w) => w.weekNumber === weekNumber) ?? null;

    const metrics = computeReportOverviewMetrics({
      year,
      weekNumber,
      areas,
      rows,
      submissions,
      weekId: selectedWeek?.id ?? null,
    });

    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error("GET /api/report/overview ERROR:", error);
    return jsonError("Failed to load report overview.", 500);
  }
}
