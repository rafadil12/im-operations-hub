import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { loadReportAreaNames, loadReportWeekById, recordReportWeek } from "@/lib/logs-center/reportRemark";
import { suppressLogsCenter } from "@/lib/logs-center/record";
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
    const areaId = parsePositiveInt(String(body.areaId ?? ""));
    if (!areaId) return jsonError("Area is required.");

    const requestedWeekId = parsePositiveInt(String(body.weekId ?? ""));
    const requestedWeek = parseWeekNumber(String(body.weekNumber ?? body.week ?? ""));
    const year = parseYear(String(body.year ?? "")) ?? new Date().getFullYear();
    if (!requestedWeekId && !requestedWeek) return jsonError("Week is required.");

    const reopened = await suppressLogsCenter(async () => {
      const id = requestedWeekId ?? (await ensureReportWeek(year, requestedWeek!));
      const ok = await reopenReportArea(id, areaId);
      const weekNumber = requestedWeek ?? (await loadReportWeekById(id))?.weekNumber ?? null;
      const submission = ok ? await getSubmissionStatus(id, areaId) : null;
      return { ok, weekNumber, submission };
    });
    if (!reopened.ok) {
      return jsonError("No submitted report found for this week and area.", 404);
    }
    if (reopened.weekNumber) {
      const area = await loadReportAreaNames(areaId);
      await recordReportWeek({ action: "reopen", weekNumber: reopened.weekNumber, area });
    }

    return NextResponse.json({ success: true, data: reopened.submission });
  } catch (error) {
    console.error("POST /api/report/submissions/reopen ERROR:", error);
    return jsonError("Failed to reopen report.", 500);
  }
}
