import { unlink } from "fs/promises";
import { NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { jsonError, parsePositiveInt } from "@/lib/report/apiHelpers";
import {
  deleteProjectAttachment,
  getProjectAttachmentById,
} from "@/lib/report/projectAttachmentStore";
import { resolveReportStoredFilePath } from "@/lib/report/upload";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requirePermission(PERMISSIONS.reportProjectUpdate);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id: rawId } = await context.params;
    const id = parsePositiveInt(rawId);
    if (!id) return jsonError("Invalid attachment id.");

    const row = await getProjectAttachmentById(id);
    if (!row) return jsonError("Attachment not found.", 404);

    const absolutePath = resolveReportStoredFilePath(row.file_url);
    if (absolutePath) {
      try {
        await unlink(absolutePath);
      } catch {
        // File may already be missing on disk.
      }
    }

    await deleteProjectAttachment(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/report/project-attachments/[id] ERROR:", error);
    return jsonError("Failed to delete attachment.", 500);
  }
}
