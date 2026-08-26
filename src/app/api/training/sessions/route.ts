import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import {
  isTrainingCategory,
  isValidDateString,
  jsonError,
  normalizeCategory,
  parseParticipantNames,
} from "@/lib/training/apiHelpers";
import { saveTrainingUploadedFile } from "@/lib/training/upload";
import { loadTrainingSessions } from "@/lib/training/sessionStore";
import type { TrainingCategory } from "@/lib/training/types";

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
    const categoryRaw = searchParams.get("category");
    const q = searchParams.get("q")?.trim() || undefined;

    const year = yearRaw ? Number(yearRaw) : undefined;
    const month = monthRaw ? Number(monthRaw) : undefined;

    if (year != null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      return jsonError("Invalid year.");
    }

    if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) {
      return jsonError("Invalid month.");
    }

    let category: TrainingCategory | undefined;
    if (categoryRaw) {
      const normalized = normalizeCategory(categoryRaw);
      if (!normalized || !isTrainingCategory(normalized)) {
        return jsonError("Invalid category.");
      }
      category = normalized;
    }

    const data = await loadTrainingSessions({ year, month, category, q });
    return NextResponse.json({ success: true, data });
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
    const category = normalizeCategory(form.get("category"));
    const topic = String(form.get("topic") ?? "").trim();
    const participants = parseParticipantNames(form.get("participants"));
    const file = form.get("file");

    if (!isValidDateString(sessionDate) || !category || !topic) {
      return jsonError("Date, category, and topic are required.");
    }

    let attachment: Awaited<ReturnType<typeof saveTrainingUploadedFile>> | null = null;
    if (file instanceof File && file.size > 0) {
      attachment = await saveTrainingUploadedFile(file, sessionDate);
    }

    const sessionId = await withTransaction(async (conn) => {
      const [insertResult] = await conn.query(
        `
          INSERT INTO training_sessions (
            session_date,
            category,
            topic,
            participant_count,
            attachment_original_name,
            attachment_stored_name,
            attachment_url,
            attachment_mime_type,
            attachment_size
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          sessionDate,
          category,
          topic,
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

      for (const name of participants) {
        await conn.query(
          `
            INSERT INTO training_session_participants (session_id, participant_name)
            VALUES (?, ?)
          `,
          [id, name]
        );
        await conn.query(
          `
            INSERT INTO training_participants (name, is_active)
            VALUES (?, 1)
            ON DUPLICATE KEY UPDATE is_active = 1, updated_at = CURRENT_TIMESTAMP
          `,
          [name]
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
