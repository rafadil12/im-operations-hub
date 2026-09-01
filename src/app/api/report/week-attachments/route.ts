import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import type { AuthAccountPublic } from "@/lib/auth/types";
import {
  insertReportWeekAttachment,
  loadReportWeekAttachments,
} from "@/lib/report/attachmentStore";
import { jsonError, parsePositiveInt, parseWeekNumber, parseYear } from "@/lib/report/apiHelpers";
import { ensureReportWeek, getSubmissionStatus } from "@/lib/report/lineStore";
import { isAllowedReportFile, MAX_REPORT_WEEK_ATTACHMENTS } from "@/lib/report/attachmentAccept";
import { saveReportUploadedFile } from "@/lib/report/upload";

export const runtime = "nodejs";

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

    const weekId = await ensureReportWeek(year, weekNumber);
    const attachments = await loadReportWeekAttachments(weekId, areaId);

    return NextResponse.json({ success: true, data: attachments });
  } catch (error) {
    console.error("GET /api/report/week-attachments ERROR:", error);
    return jsonError("Failed to load attachments.", 500);
  }
}

export async function POST(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.reportLineCreate,
    PERMISSIONS.reportLineUpdate,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const form = await request.formData();
    const year = parseYear(String(form.get("year") ?? ""));
    const weekNumber = parseWeekNumber(String(form.get("weekNumber") ?? form.get("week") ?? ""));
    const areaId = parsePositiveInt(String(form.get("areaId") ?? ""));
    const file = form.get("file");

    if (!year || !weekNumber || !areaId) {
      return jsonError("Year, week, and area are required.");
    }

    if (!(file instanceof File) || file.size === 0) {
      return jsonError("File is required.");
    }

    if (!isAllowedReportFile(file.name)) {
      return jsonError("Unsupported file type. Allowed: PPT, Excel, PDF, PNG, JPEG.");
    }

    const weekId = await ensureReportWeek(year, weekNumber);
    const submission = await getSubmissionStatus(weekId, areaId);
    if (submission?.status === "submitted") {
      return jsonError("This week report is submitted and cannot be edited.");
    }

    const existing = await loadReportWeekAttachments(weekId, areaId);
    if (existing.length >= MAX_REPORT_WEEK_ATTACHMENTS) {
      return jsonError(`Maximum ${MAX_REPORT_WEEK_ATTACHMENTS} attachments per report.`);
    }

    const uploaded = await saveReportUploadedFile(file, year, weekNumber);
    const account: AuthAccountPublic | undefined =
      "account" in gate ? (gate.account ?? undefined) : undefined;

    const attachment = await insertReportWeekAttachment({
      weekId,
      areaId,
      originalName: uploaded.originalName,
      storedName: uploaded.storedName,
      fileUrl: uploaded.url,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      uploadedBySystemUserId: account?.systemUserId ?? null,
    });

    return NextResponse.json({ success: true, data: attachment });
  } catch (error) {
    console.error("POST /api/report/week-attachments ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to upload attachment.";
    return jsonError(message, 400);
  }
}
