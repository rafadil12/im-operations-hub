import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission, requirePermission } from "@/lib/auth";
import { execute } from "@/lib/db";
import {
  hasTopicText,
  isValidDateString,
  jsonError,
  parseDivisionId,
  parseParticipantNames,
} from "@/lib/training/apiHelpers";
import { saveTrainingUploadedFile } from "@/lib/training/upload";
import {
  assertDivisionExists,
  loadTrainingSessions,
  replaceSessionParticipants,
} from "@/lib/training/sessionStore";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireAnyPermission([
    PERMISSIONS.trainingOverviewView,
    PERMISSIONS.trainingSessionRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id: idRaw } = await context.params;
    const id = Number(idRaw);
    if (!Number.isInteger(id) || id <= 0) return jsonError("Invalid session id.");

    const [data] = await loadTrainingSessions({ id });
    if (!data) return jsonError("Session not found.", 404);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/training/sessions/[id] ERROR:", error);
    return jsonError("Failed to load session.", 500);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const gate = await requirePermission(PERMISSIONS.trainingSessionUpdate);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id: idRaw } = await context.params;
    const id = Number(idRaw);
    if (!Number.isInteger(id) || id <= 0) return jsonError("Invalid session id.");

    const [existing] = await loadTrainingSessions({ id });
    if (!existing) return jsonError("Session not found.", 404);

    const form = await request.formData();
    const sessionDate = String(form.get("sessionDate") ?? existing.sessionDate).trim();
    const divisionId =
      parseDivisionId(form.get("divisionId")) ?? existing.divisionId;
    const topicEn = String(form.get("topicEn") ?? existing.topicEn).trim();
    const topicCn = String(form.get("topicCn") ?? existing.topicCn).trim();
    const participants = form.has("participants")
      ? parseParticipantNames(form.get("participants"))
      : existing.participants;
    const removeAttachment = String(form.get("removeAttachment") ?? "") === "1";
    const file = form.get("file");

    if (!isValidDateString(sessionDate) || !divisionId || !hasTopicText(topicEn, topicCn)) {
      return jsonError("Date, division, and at least one topic language are required.");
    }

    if (!(await assertDivisionExists(divisionId))) {
      return jsonError("Invalid division.");
    }

    let attachmentOriginal = existing.attachment?.originalName ?? null;
    let attachmentStored = existing.attachment
      ? existing.attachment.url.split("/").pop() ?? null
      : null;
    let attachmentUrl = existing.attachment?.url ?? null;
    let attachmentMime = existing.attachment?.mimeType ?? null;
    let attachmentSize = existing.attachment?.size ?? null;

    if (removeAttachment) {
      attachmentOriginal = null;
      attachmentStored = null;
      attachmentUrl = null;
      attachmentMime = null;
      attachmentSize = null;
    }

    if (file instanceof File && file.size > 0) {
      const uploaded = await saveTrainingUploadedFile(file, sessionDate);
      attachmentOriginal = uploaded.originalName;
      attachmentStored = uploaded.storedName;
      attachmentUrl = uploaded.url;
      attachmentMime = uploaded.mimeType;
      attachmentSize = uploaded.size;
    }

    const resolvedTopicEn = topicEn || topicCn;
    const resolvedTopicCn = topicCn || topicEn;

    await execute(
      `
        UPDATE training_sessions
        SET
          session_date = ?,
          division_id = ?,
          topic_en = ?,
          topic_cn = ?,
          participant_count = ?,
          attachment_original_name = ?,
          attachment_stored_name = ?,
          attachment_url = ?,
          attachment_mime_type = ?,
          attachment_size = ?
        WHERE id = ?
      `,
      [
        sessionDate,
        divisionId,
        resolvedTopicEn,
        resolvedTopicCn,
        participants.length,
        attachmentOriginal,
        attachmentStored,
        attachmentUrl,
        attachmentMime,
        attachmentSize,
        id,
      ]
    );

    await replaceSessionParticipants(id, participants);

    const [data] = await loadTrainingSessions({ id });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("PATCH /api/training/sessions/[id] ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to update session.";
    return jsonError(message, 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const gate = await requirePermission(PERMISSIONS.trainingSessionDelete);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id: idRaw } = await context.params;
    const id = Number(idRaw);
    if (!Number.isInteger(id) || id <= 0) return jsonError("Invalid session id.");

    const result = await execute(`DELETE FROM training_sessions WHERE id = ?`, [id]);
    if (!result.affectedRows) return jsonError("Session not found.", 404);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/training/sessions/[id] ERROR:", error);
    return jsonError("Failed to delete session.", 500);
  }
}
