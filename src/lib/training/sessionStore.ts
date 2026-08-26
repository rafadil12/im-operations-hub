import { execute, query } from "@/lib/db";
import {
  groupParticipantsBySession,
  mapSessionRow,
} from "@/lib/training/apiHelpers";
import type {
  TrainingCategory,
  TrainingSession,
  TrainingSessionParticipantRow,
  TrainingSessionRow,
} from "@/lib/training/types";

export async function loadTrainingSessions(filters: {
  year?: number;
  month?: number;
  category?: TrainingCategory;
  q?: string;
  id?: number;
}): Promise<TrainingSession[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.id != null) {
    where.push("id = ?");
    params.push(filters.id);
  }

  if (filters.year) {
    where.push("YEAR(session_date) = ?");
    params.push(filters.year);
  }

  if (filters.month) {
    where.push("MONTH(session_date) = ?");
    params.push(filters.month);
  }

  if (filters.category) {
    where.push("category = ?");
    params.push(filters.category);
  }

  if (filters.q) {
    where.push(
      `(topic LIKE ? OR id IN (
        SELECT session_id FROM training_session_participants
        WHERE participant_name LIKE ?
      ))`
    );
    const like = `%${filters.q}%`;
    params.push(like, like);
  }

  const rows = await query<TrainingSessionRow[]>(
    `
      SELECT
        id,
        session_date,
        category,
        topic,
        participant_count,
        attachment_original_name,
        attachment_stored_name,
        attachment_url,
        attachment_mime_type,
        attachment_size,
        created_at,
        updated_at
      FROM training_sessions
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY session_date DESC, id DESC
    `,
    params
  );

  const ids = rows.map((row) => Number(row.id));
  const participantRows =
    ids.length > 0
      ? await query<TrainingSessionParticipantRow[]>(
          `
            SELECT id, session_id, participant_name
            FROM training_session_participants
            WHERE session_id IN (${ids.map(() => "?").join(",")})
            ORDER BY id ASC
          `,
          ids
        )
      : [];

  const bySession = groupParticipantsBySession(participantRows);

  return rows.map((row) => mapSessionRow(row, bySession.get(Number(row.id)) ?? []));
}

export async function upsertParticipantsMaster(names: string[]) {
  for (const name of names) {
    await execute(
      `
        INSERT INTO training_participants (name, is_active)
        VALUES (?, 1)
        ON DUPLICATE KEY UPDATE is_active = 1, updated_at = CURRENT_TIMESTAMP
      `,
      [name]
    );
  }
}

export async function replaceSessionParticipants(sessionId: number, names: string[]) {
  await execute(`DELETE FROM training_session_participants WHERE session_id = ?`, [sessionId]);
  for (const name of names) {
    await execute(
      `
        INSERT INTO training_session_participants (session_id, participant_name)
        VALUES (?, ?)
      `,
      [sessionId, name]
    );
  }
  await upsertParticipantsMaster(names);
}
