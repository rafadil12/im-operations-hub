import { unlink } from "fs/promises";
import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import type { AuthAccountPublic } from "@/lib/auth/types";
import {
  deleteReportWeekAttachment,
  getReportWeekAttachmentById,
} from "@/lib/report/attachmentStore";
import { jsonError, parsePositiveInt } from "@/lib/report/apiHelpers";
import { getSubmissionStatus, stampSubmissionActors } from "@/lib/report/lineStore";
import { resolveReportStoredFilePath } from "@/lib/report/upload";
import { loadWeekArea, recordReportAttachment } from "@/lib/logs-center/reportRemark";
import { suppressLogsCenter } from "@/lib/logs-center/record";

export const runtime = "nodejs";

function actorFromAccount(account: AuthAccountPublic | undefined) {
  if (!account) {
    return { changedBySystemUserId: null, changedByLabel: null };
  }
  const label = account.employeeId
    ? `${account.employeeId} - ${account.displayName}`
    : account.displayName;
  return {
    changedBySystemUserId: account.systemUserId ?? null,
    changedByLabel: label,
  };
}

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

    const account: AuthAccountPublic | undefined =
      "account" in gate ? (gate.account ?? undefined) : undefined;
    const weekId = Number(row.week_id);
    const areaId = Number(row.area_id);

    await suppressLogsCenter(async () => {
      await deleteReportWeekAttachment(id);
      await stampSubmissionActors(null, weekId, areaId, actorFromAccount(account));
    });
    const place = await loadWeekArea(weekId, areaId);
    await recordReportAttachment({
      action: "delete",
      fileName: row.original_name,
      parent: { type: "week", weekNumber: place?.weekNumber ?? 0, area: place?.area ?? null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/report/week-attachments/[id] ERROR:", error);
    return jsonError("Failed to delete attachment.", 500);
  }
}
