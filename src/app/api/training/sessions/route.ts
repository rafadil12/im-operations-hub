import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
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
  loadTrainingDivisions,
  loadTrainingSessions,
} from "@/lib/training/sessionStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.trainingOverviewView,
    PERMISSIONS.trainingSessionRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const yearRaw = searchParams.get("year");
    const monthRaw = searchParams.get("month");
    const divisionIdRaw = searchParams.get("divisionId");
    const q = searchParams.get("q")?.trim() || undefined;

    const year = yearRaw ? Number(yearRaw) : undefined;
    const month = monthRaw ? Number(monthRaw) : undefined;

    if (year != null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      return jsonError("Invalid year.");
    }

    if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) {
      return jsonError("Invalid month.");
    }

    let divisionId: number | undefined;
    if (divisionIdRaw) {
      const parsed = parseDivisionId(divisionIdRaw);
      if (!parsed) return jsonError("Invalid division.");
      divisionId = parsed;
    }

    const [data, divisions] = await Promise.all([
      loadTrainingSessions({ year, month, divisionId, q }),
      loadTrainingDivisions(),
    ]);

    return NextResponse.json({ success: true, data, divisions });
  } catch (error) {
    console.error("GET /api/training/sessions ERROR:", error);
    return jsonError("Failed to load training sessions.", 500);
  }
}

export async function POST(request: Request) {
  const gate = await requireAnyPermission([PERMISSIONS.trainingSessionCreate]);
  if (gate instanceof NextResponse) return gate;

  try {
    const form = await request.formData();
    const sessionDate = String(form.get("sessionDate") ?? "").trim();
    const divisionId = parseDivisionId(form.get("divisionId"));
    const topicEn = String(form.get("topicEn") ?? "").trim();
    const topicCn = String(form.get("topicCn") ?? "").trim();
    const participants = parseParticipantNames(form.get("participants"));
    const file = form.get("file");

    if (!isValidDateString(sessionDate) || !divisionId || !hasTopicText(topicEn, topicCn)) {
      return jsonError("Date, division, and at least one topic language are required.");
    }

    if (!(await assertDivisionExists(divisionId))) {
      return jsonError("Invalid division.");
    }

    let attachment: Awaited<ReturnType<typeof saveTrainingUploadedFile>> | null = null;
    if (file instanceof File && file.size > 0) {
      attachment = await saveTrainingUploadedFile(file, sessionDate);
    }

    const resolvedTopicEn = topicEn || topicCn;
    const resolvedTopicCn = topicCn || topicEn;

    const sessionId = await withTransaction(async (conn) => {
      const [insertResult] = await conn.query(
        `
          INSERT INTO training_sessions (
            session_date,
            division_id,
            topic_en,
            topic_cn,
            participant_count,
            attachment_original_name,
            attachment_stored_name,
            attachment_url,
            attachment_mime_type,
            attachment_size
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          sessionDate,
          divisionId,
          resolvedTopicEn,
          resolvedTopicCn,
          participants.length,
          attachment?.originalName ?? null,
          attachment?.storedName ?? null,
          attachment?.url ?? null,
          attachment?.mimeType ?? null,
          attachment?.size ?? null,
        ]
      );

      const header = insertResult as { insertId: number };
      const id = Number(header.insertId);

      for (const person of participants) {
        await conn.query(
          `
            INSERT INTO training_session_participants (session_id, participant_name_en, participant_name_cn)
            VALUES (?, ?, ?)
          `,
          [id, person.nameEn, person.nameCn]
        );
        await conn.query(
          `
            INSERT INTO training_participants (name_en, name_cn, is_active)
            VALUES (?, ?, 1)
            ON DUPLICATE KEY UPDATE
              name_cn = VALUES(name_cn),
              is_active = 1,
              updated_at = CURRENT_TIMESTAMP
          `,
          [person.nameEn, person.nameCn]
        );
      }

      return id;
    });

    const [data] = await loadTrainingSessions({ id: sessionId });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/training/sessions ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to create session.";
    return jsonError(message, 500);
  }
}
