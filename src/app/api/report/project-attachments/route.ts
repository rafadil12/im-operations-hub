import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission, requirePermission } from "@/lib/auth";
import type { AuthAccountPublic } from "@/lib/auth/types";
import { jsonError, parsePositiveInt } from "@/lib/report/apiHelpers";
import { isAllowedReportFile, MAX_REPORT_WEEK_ATTACHMENTS } from "@/lib/report/attachmentAccept";
import {
  insertProjectAttachment,
  loadProjectAttachments,
} from "@/lib/report/projectAttachmentStore";
import { getProjectReportById } from "@/lib/report/projectStore";
import { saveReportUploadedFile } from "@/lib/report/upload";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function GET(request: Request) {
  const gate = await requirePermission(PERMISSIONS.reportProjectRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const reportId = parsePositiveInt(searchParams.get("reportId"));
    if (!reportId) return jsonError("reportId is required.");

    const report = await getProjectReportById(reportId);
    if (!report) return jsonError("Project report not found.", 404);

    const attachments = await loadProjectAttachments(reportId);
    return NextResponse.json({ success: true, data: attachments });
  } catch (error) {
    console.error("GET /api/report/project-attachments ERROR:", error);
    return jsonError("Failed to load attachments.", 500);
  }
}

export async function POST(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.reportProjectCreate,
    PERMISSIONS.reportProjectUpdate,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const form = await request.formData();
    const reportId = parsePositiveInt(String(form.get("reportId") ?? ""));
    const file = form.get("file");

    if (!reportId) return jsonError("reportId is required.");
    if (!(file instanceof File) || file.size === 0) {
      return jsonError("File is required.");
    }
    if (file.size > MAX_FILE_BYTES) {
      return jsonError("File exceeds the 10 MB limit.");
    }
    if (!isAllowedReportFile(file.name)) {
      return jsonError("Unsupported file type. Allowed: PPT, Excel, PDF, PNG, JPEG.");
    }

    const report = await getProjectReportById(reportId);
    if (!report) return jsonError("Project report not found.", 404);

    const existing = await loadProjectAttachments(reportId);
    if (existing.length >= MAX_REPORT_WEEK_ATTACHMENTS) {
      return jsonError(`Maximum ${MAX_REPORT_WEEK_ATTACHMENTS} attachments per report.`);
    }

    const uploaded = await saveReportUploadedFile(
      file,
      report.year,
      report.weekNumber,
      "projects"
    );
    const account: AuthAccountPublic | undefined =
      "account" in gate ? (gate.account ?? undefined) : undefined;

    const attachment = await insertProjectAttachment({
      reportId,
      originalName: uploaded.originalName,
      storedName: uploaded.storedName,
      fileUrl: uploaded.url,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      uploadedBySystemUserId: account?.systemUserId ?? null,
    });

    return NextResponse.json({ success: true, data: attachment });
  } catch (error) {
    console.error("POST /api/report/project-attachments ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to upload attachment.";
    return jsonError(message, 400);
  }
}
