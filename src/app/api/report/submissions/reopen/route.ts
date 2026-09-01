import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { jsonError, parsePositiveInt, parseWeekNumber, parseYear } from "@/lib/report/apiHelpers";
import {
  ensureReportWeek,
  getSubmissionStatus,
  reopenReportArea,
} from "@/lib/report/lineStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireAnyPermission([PERMISSIONS.reportSubmissionReopen]);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await request.json();
    let weekId = parsePositiveInt(String(body.weekId ?? ""));
    const areaId = parsePositiveInt(String(body.areaId ?? ""));

    if (!areaId) return jsonError("Area is required.");

    if (!weekId) {
      const year = parseYear(String(body.year ?? "")) ?? new Date().getFullYear();
      const weekNumber = parseWeekNumber(String(body.weekNumber ?? body.week ?? ""));
      if (!weekNumber) return jsonError("Week is required.");
      weekId = await ensureReportWeek(year, weekNumber);
    }

    const reopened = await reopenReportArea(weekId, areaId);
    if (!reopened) {
      return jsonError("No submitted report found for this week and area.", 404);
    }

    const submission = await getSubmissionStatus(weekId, areaId);
    return NextResponse.json({ success: true, data: submission });
  } catch (error) {
    console.error("POST /api/report/submissions/reopen ERROR:", error);
    return jsonError("Failed to reopen report.", 500);
  }
}
