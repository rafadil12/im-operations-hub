import { NextResponse } from "next/server";
import type { AuthAccountPublic } from "@/lib/auth/types";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import {
  jsonError,
  parsePositiveInt,
  parseWeekNumber,
  parseYear,
} from "@/lib/report/apiHelpers";
import {
  countWeekLineChanges,
  loadReportAreaNames,
  loadReportWeekByNumber,
  recordReportWeek,
  weekDeleteDetail,
  weekLineDetail,
} from "@/lib/logs-center/reportRemark";
import { suppressLogsCenter } from "@/lib/logs-center/record";
import {
  loadReportAreas,
  loadReportLines,
  loadReportSubItems,
  loadReportWeeks,
  submitReportArea,
} from "@/lib/report/lineStore";
import {
  deleteReportWeekLines,
  loadReportWeekBundle,
  saveReportWeekLines,
  type ReportWeekLinePayload,
} from "@/lib/report/weekReportStore";
import { WEEK_REPORT_ALREADY_EXISTS } from "@/lib/report/weekReportIdentity";
import { loadReportWeekAttachments } from "@/lib/report/attachmentStore";
import { parseCompletionRate } from "@/lib/report/weekCalendar";
import { validateWeekLinePayload } from "@/lib/report/weekFormValidation";

export const runtime = "nodejs";

function submitterFromAccount(account: AuthAccountPublic | undefined) {
  if (!account) return { systemUserId: null, label: null };
  const label = account.employeeId
    ? `${account.employeeId} - ${account.displayName}`
    : account.displayName;
  return { systemUserId: account.systemUserId, label };
}

function auditFromAccount(account: AuthAccountPublic | undefined) {
  const { systemUserId, label } = submitterFromAccount(account);
  return {
    changedBySystemUserId: systemUserId,
    changedByLabel: label,
  };
}

function parseLinePayload(raw: unknown, index: number): ReportWeekLinePayload | string {
  if (!raw || typeof raw !== "object") return `Line ${index + 1} is invalid.`;
  const row = raw as Record<string, unknown>;
  const subItemId = parsePositiveInt(String(row.subItemId ?? ""));
  if (!subItemId) return `Line ${index + 1}: sub-item is required.`;

  const workTargetEn = String(row.workTargetEn ?? "").trim();
  const workTargetCn = String(row.workTargetCn ?? "").trim();
  const summaryEn = String(row.summaryEn ?? "").trim();
  const summaryCn = String(row.summaryCn ?? "").trim();
  const planEn = String(row.planEn ?? "").trim() || null;
  const planCn = String(row.planCn ?? "").trim() || null;

  const id = row.id != null && row.id !== "" ? parsePositiveInt(String(row.id)) : undefined;

  const payload: ReportWeekLinePayload = {
    id: id ?? undefined,
    subItemId,
    workTargetEn,
    workTargetCn,
    weeklyCompletionRate: parseCompletionRate(row.weeklyCompletionRate),
    summaryEn,
    summaryCn,
    planEn,
    planCn,
  };

  const validationError = validateWeekLinePayload(payload, index);
  if (validationError) return validationError;

  return payload;
}

export async function GET(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.reportOverviewView,
    PERMISSIONS.reportLineRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const year = parseYear(searchParams.get("year"));
    const weekNumber = parseWeekNumber(searchParams.get("week"));
    const areaId = parsePositiveInt(searchParams.get("areaId"));

    if (!year || !weekNumber || !areaId) {
      return jsonError("year, week, and areaId are required.");
    }

    const bundle = await suppressLogsCenter(() => loadReportWeekBundle(year, weekNumber, areaId));
    const [areas, subItems, weeks, attachments] = await Promise.all([
      loadReportAreas(),
      loadReportSubItems(areaId),
      loadReportWeeks(year),
      loadReportWeekAttachments(bundle.weekId, areaId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        year,
        weekNumber,
        areaId,
        weekId: bundle.weekId,
        lines: bundle.lines,
        submission: bundle.submission,
        attachments,
      },
      areas,
      subItems,
      weeks,
    });
  } catch (error) {
    console.error("GET /api/report/week-lines ERROR:", error);
    return jsonError("Failed to load week report.", 500);
  }
}

export async function PUT(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.reportLineCreate,
    PERMISSIONS.reportLineUpdate,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await request.json();
    const year = parseYear(String(body.year ?? ""));
    const weekNumber = parseWeekNumber(String(body.weekNumber ?? body.week ?? ""));
    const areaId = parsePositiveInt(String(body.areaId ?? ""));

    if (!year || !weekNumber || !areaId) {
      return jsonError("Year, week, and area are required.");
    }

    const rawLines = Array.isArray(body.lines) ? body.lines : [];
    const lines: ReportWeekLinePayload[] = [];
    for (let i = 0; i < rawLines.length; i += 1) {
      const parsed = parseLinePayload(rawLines[i], i);
      if (typeof parsed === "string") return jsonError(parsed);
      lines.push(parsed);
    }

    const create = body.mode === "create";
    const existingWeek = await loadReportWeekByNumber(year, weekNumber);
    const before = existingWeek ? await loadReportLines({ weekId: existingWeek.id, areaId }) : [];
    const detail = weekLineDetail(countWeekLineChanges(before, lines));
    if (!detail && lines.length > 0) {
      return NextResponse.json({ success: true, data: before });
    }
    const account = "account" in gate ? (gate.account ?? undefined) : undefined;
    const saved = await suppressLogsCenter(() =>
      saveReportWeekLines(year, weekNumber, areaId, lines, auditFromAccount(account), { create })
    );
    if (detail) {
      const area = await loadReportAreaNames(areaId);
      await recordReportWeek({ action: "save", weekNumber, area, detail });
    }

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error("PUT /api/report/week-lines ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to save week report.";
    const status = message === WEEK_REPORT_ALREADY_EXISTS ? 409 : 400;
    return jsonError(message, status);
  }
}

export async function POST(request: Request) {
  const gate = await requireAnyPermission([PERMISSIONS.reportSubmissionSubmit]);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await request.json();
    const year = parseYear(String(body.year ?? "")) ?? new Date().getFullYear();
    const weekNumber = parseWeekNumber(String(body.weekNumber ?? body.week ?? ""));
    const areaId = parsePositiveInt(String(body.areaId ?? ""));

    if (!weekNumber || !areaId) return jsonError("Week and area are required.");

    const bundle = await suppressLogsCenter(() => loadReportWeekBundle(year, weekNumber, areaId));
    if (!bundle.lines.length) {
      return jsonError("Cannot submit an empty week report.");
    }
    if (bundle.submission?.status === "submitted") {
      return jsonError("This week report is already submitted.");
    }

    const account = "account" in gate ? (gate.account ?? undefined) : undefined;
    const { systemUserId, label } = submitterFromAccount(account);
    await suppressLogsCenter(() => submitReportArea(bundle.weekId, areaId, systemUserId, label));
    const area = await loadReportAreaNames(areaId);
    await recordReportWeek({ action: "submit", weekNumber, area });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/report/week-lines ERROR:", error);
    return jsonError("Failed to submit week report.", 500);
  }
}

export async function DELETE(request: Request) {
  const gate = await requireAnyPermission([PERMISSIONS.reportLineDelete]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const year = parseYear(searchParams.get("year"));
    const weekNumber = parseWeekNumber(searchParams.get("week") ?? searchParams.get("weekNumber"));
    const areaId = parsePositiveInt(searchParams.get("areaId"));
    if (!year || !weekNumber || !areaId) {
      return jsonError("Year, week, and area are required.");
    }

    const week = await loadReportWeekByNumber(year, weekNumber);
    if (!week) return jsonError("Week report not found.", 404);
    const lines = await loadReportLines({ weekId: week.id, areaId });
    if (!lines.length) return jsonError("Week report not found.", 404);

    await suppressLogsCenter(() => deleteReportWeekLines(week.id, areaId));
    const area = await loadReportAreaNames(areaId);
    await recordReportWeek({
      action: "delete",
      weekNumber,
      area,
      detail: weekDeleteDetail(lines.length),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/report/week-lines ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to delete week report.";
    const status = message === "This week report is submitted and cannot be edited." ? 400 : 500;
    return jsonError(message, status);
  }
}
