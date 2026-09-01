import { unlink } from "fs/promises";
import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import {
  deleteReportWeekAttachment,
  getReportWeekAttachmentById,
} from "@/lib/report/attachmentStore";
import { jsonError, parsePositiveInt } from "@/lib/report/apiHelpers";
import { getSubmissionStatus } from "@/lib/report/lineStore";
import { resolveReportStoredFilePath } from "@/lib/report/upload";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireAnyPermission([
    PERMISSIONS.reportLineCreate,
    PERMISSIONS.reportLineUpdate,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id: rawId } = await context.params;
    const id = parsePositiveInt(rawId);
    if (!id) return jsonError("Invalid attachment id.");

    const row = await getReportWeekAttachmentById(id);
    if (!row) return jsonError("Attachment not found.", 404);

    const submission = await getSubmissionStatus(Number(row.week_id), Number(row.area_id));
    if (submission?.status === "submitted") {
      return jsonError("This week report is submitted and cannot be edited.");
    }

    const absolutePath = resolveReportStoredFilePath(row.file_url);
    if (absolutePath) {
      try {
        await unlink(absolutePath);
      } catch {
        // File may already be missing on disk.
      }
    }

    await deleteReportWeekAttachment(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/report/week-attachments/[id] ERROR:", error);
    return jsonError("Failed to delete attachment.", 500);
  }
}
