import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { jsonError, parsePositiveInt, parseWeekNumber, parseYear } from "@/lib/report/apiHelpers";
import {
  ensureReportWeek,
  getSubmissionStatus,
  submitReportArea,
} from "@/lib/report/lineStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.reportOverviewView,
    PERMISSIONS.reportLineRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const weekId = parsePositiveInt(searchParams.get("weekId"));
    const areaId = parsePositiveInt(searchParams.get("areaId"));

    if (!weekId || !areaId) return jsonError("weekId and areaId are required.");

    const submission = await getSubmissionStatus(weekId, areaId);
    return NextResponse.json({ success: true, data: submission });
  } catch (error) {
    console.error("GET /api/report/submissions ERROR:", error);
    return jsonError("Failed to load submission status.", 500);
  }
}

export async function POST(request: Request) {
  const gate = await requireAnyPermission([PERMISSIONS.reportSubmissionSubmit]);
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

    const account = "account" in gate ? gate.account : undefined;
    const systemUserId = account?.systemUserId ?? null;
    const submitterLabel = account
      ? account.employeeId
        ? `${account.employeeId} - ${account.displayName}`
        : account.displayName
      : null;

    await submitReportArea(weekId, areaId, systemUserId, submitterLabel);
    const submission = await getSubmissionStatus(weekId, areaId);
    return NextResponse.json({ success: true, data: submission });
  } catch (error) {
    console.error("POST /api/report/submissions ERROR:", error);
    return jsonError("Failed to submit report.", 500);
  }
}
