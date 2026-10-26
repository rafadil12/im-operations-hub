import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { loadReportAreaNames, loadReportWeekById, recordReportWeek } from "@/lib/logs-center/reportRemark";
import { suppressLogsCenter } from "@/lib/logs-center/record";
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
    const areaId = parsePositiveInt(String(body.areaId ?? ""));
    if (!areaId) return jsonError("Area is required.");

    const requestedWeekId = parsePositiveInt(String(body.weekId ?? ""));
    const requestedWeek = parseWeekNumber(String(body.weekNumber ?? body.week ?? ""));
    const year = parseYear(String(body.year ?? "")) ?? new Date().getFullYear();
    if (!requestedWeekId && !requestedWeek) return jsonError("Week is required.");

    const account = "account" in gate ? gate.account : undefined;
    const systemUserId = account?.systemUserId ?? null;
    const submitterLabel = account
      ? account.employeeId
        ? `${account.employeeId} - ${account.displayName}`
        : account.displayName
      : null;

    const submitted = await suppressLogsCenter(async () => {
      const id = requestedWeekId ?? (await ensureReportWeek(year, requestedWeek!));
      const current = await getSubmissionStatus(id, areaId);
      if (current?.status === "submitted") {
        return { already: true as const, submission: current };
      }
      const weekNumber = requestedWeek ?? (await loadReportWeekById(id))?.weekNumber ?? null;
      await submitReportArea(id, areaId, systemUserId, submitterLabel);
      const submission = await getSubmissionStatus(id, areaId);
      return { already: false as const, weekNumber, submission };
    });

    if (!submitted.already && submitted.weekNumber) {
      const area = await loadReportAreaNames(areaId);
      await recordReportWeek({ action: "submit", weekNumber: submitted.weekNumber, area });
    }
    return NextResponse.json({ success: true, data: submitted.submission });
  } catch (error) {
    console.error("POST /api/report/submissions ERROR:", error);
    return jsonError("Failed to submit report.", 500);
  }
}
