import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import {
  hasTextPair,
  jsonError,
  parsePositiveInt,
  parseWeekNumber,
  parseYear,
} from "@/lib/report/apiHelpers";
import {
  ensureDraftSubmission,
  ensureReportWeek,
  insertReportLine,
  loadReportAreas,
  loadReportSubItems,
  loadReportLines,
} from "@/lib/report/lineStore";
import { parseCompletionRate } from "@/lib/report/weekCalendar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.reportOverviewView,
    PERMISSIONS.reportLineRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const year = parseYear(searchParams.get("year")) ?? undefined;
    const weekNumber = parseWeekNumber(searchParams.get("week")) ?? undefined;
    const weekId = parsePositiveInt(searchParams.get("weekId")) ?? undefined;
    const areaId = parsePositiveInt(searchParams.get("areaId")) ?? undefined;

    const [lines, areas, subItems] = await Promise.all([
      loadReportLines({ year, weekNumber, weekId, areaId }),
      loadReportAreas(),
      loadReportSubItems(),
    ]);

    return NextResponse.json({ success: true, data: lines, areas, subItems });
  } catch (error) {
    console.error("GET /api/report/lines ERROR:", error);
    return jsonError("Failed to load report lines.", 500);
  }
}

export async function POST(request: Request) {
  const gate = await requireAnyPermission([PERMISSIONS.reportLineCreate]);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await request.json();
    const year = parseYear(String(body.year ?? "")) ?? new Date().getFullYear();
    const weekNumber = parseWeekNumber(String(body.weekNumber ?? body.week ?? ""));
    const areaId = parsePositiveInt(String(body.areaId ?? ""));
    const subItemId =
      body.subItemId != null && body.subItemId !== ""
        ? parsePositiveInt(String(body.subItemId))
        : null;

    const workTargetEn = String(body.workTargetEn ?? "").trim();
    const workTargetCn = String(body.workTargetCn ?? "").trim();
    const summaryEn = String(body.summaryEn ?? "").trim();
    const summaryCn = String(body.summaryCn ?? "").trim();
    const planEn = String(body.planEn ?? "").trim() || null;
    const planCn = String(body.planCn ?? "").trim() || null;
    const rate = parseCompletionRate(body.weeklyCompletionRate);

    if (!weekNumber || !areaId) {
      return jsonError("Week and area are required.");
    }
    if (!subItemId) {
      return jsonError("Sub-item is required.");
    }
    if (!hasTextPair(workTargetEn, workTargetCn)) {
      return jsonError("Target (EN or CN) is required.");
    }
    if (!hasTextPair(summaryEn, summaryCn)) {
      return jsonError("Summary (EN or CN) is required.");
    }

    const weekId = await ensureReportWeek(year, weekNumber);
    await ensureDraftSubmission(weekId, areaId);

    const id = await insertReportLine({
      weekId,
      areaId,
      subItemId,
      workTargetEn: workTargetEn || workTargetCn,
      workTargetCn: workTargetCn || workTargetEn,
      weeklyCompletionRate: rate,
      summaryEn: summaryEn || summaryCn,
      summaryCn: summaryCn || summaryEn,
      planEn: planEn || planCn,
      planCn: planCn || planEn,
      sortOrder: Number(body.sortOrder ?? 0),
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("POST /api/report/lines ERROR:", error);
    return jsonError("Failed to create report line.", 500);
  }
}
