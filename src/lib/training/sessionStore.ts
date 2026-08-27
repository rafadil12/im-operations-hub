import { execute, query } from "@/lib/db";
import {
  groupParticipantsBySession,
  mapSessionRow,
} from "@/lib/training/apiHelpers";
import type {
  TrainingDivision,
  TrainingParticipantName,
  TrainingSession,
  TrainingSessionParticipantRow,
  TrainingSessionRow,
} from "@/lib/training/types";

export async function loadTrainingDivisions(): Promise<TrainingDivision[]> {
  const rows = await query<{ id: number; name_en: string | null; name_cn: string | null }[]>(
    `
      SELECT id, name_en, name_cn
      FROM divisions
      ORDER BY id ASC
    `
  );

  return rows.map((row) => ({
    id: Number(row.id),
    nameEn: row.name_en ?? "",
    nameCn: row.name_cn ?? "",
  }));
}

export async function loadTrainingSessions(filters: {
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
  divisionId?: number;
  q?: string;
  id?: number;
}): Promise<TrainingSession[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.id != null) {
    where.push("ts.id = ?");
    params.push(filters.id);
  }

  if (filters.startDate) {
    where.push("ts.session_date >= ?");
    params.push(filters.startDate.slice(0, 10));
  }

  if (filters.endDate) {
    where.push("ts.session_date <= ?");
    params.push(filters.endDate.slice(0, 10));
  }

  if (filters.year) {
    where.push("YEAR(ts.session_date) = ?");
    params.push(filters.year);
  }

  if (filters.month) {
    where.push("MONTH(ts.session_date) = ?");
    params.push(filters.month);
  }

  if (filters.divisionId) {
    where.push("ts.division_id = ?");
    params.push(filters.divisionId);
  }

  if (filters.q) {
    where.push(
      `(ts.topic_en LIKE ? OR ts.topic_cn LIKE ? OR ts.id IN (
        SELECT session_id FROM training_session_participants
        WHERE participant_name_en LIKE ? OR participant_name_cn LIKE ?
      ))`
    );
    const like = `%${filters.q}%`;
    params.push(like, like, like, like);
  }

  const rows = await query<TrainingSessionRow[]>(
    `
      SELECT
        ts.id,
        ts.session_date,
        ts.division_id,
        d.name_en AS division_name_en,
        d.name_cn AS division_name_cn,
        ts.topic_en,
        ts.topic_cn,
        ts.participant_count,
        ts.attachment_original_name,
        ts.attachment_stored_name,
        ts.attachment_url,
        ts.attachment_mime_type,
        ts.attachment_size,
        ts.created_at,
        ts.updated_at
      FROM training_sessions ts
      LEFT JOIN divisions d ON d.id = ts.division_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY ts.session_date DESC, ts.id DESC
    `,
    params
  );

  const ids = rows.map((row) => Number(row.id));
  // Prefer master bilingual names (name_cn) over junction snapshot when master exists.
  const participantRows =
    ids.length > 0
      ? await query<TrainingSessionParticipantRow[]>(
          `
            SELECT
              tsp.id,
              tsp.session_id,
              COALESCE(tp.name_en, tsp.participant_name_en) AS participant_name_en,
              COALESCE(
                NULLIF(tp.name_cn, ''),
                NULLIF(tsp.participant_name_cn, ''),
                tsp.participant_name_en
              ) AS participant_name_cn
            FROM training_session_participants tsp
            LEFT JOIN training_participants tp
              ON tp.name_en = tsp.participant_name_en
            WHERE tsp.session_id IN (${ids.map(() => "?").join(",")})
            ORDER BY tsp.id ASC
          `,
          ids
        )
      : [];

  const bySession = groupParticipantsBySession(participantRows);

  return rows.map((row) => mapSessionRow(row, bySession.get(Number(row.id)) ?? []));
}

export async function upsertParticipantsMaster(participants: TrainingParticipantName[]) {
  for (const person of participants) {
    await execute(
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
}

export async function replaceSessionParticipants(
  sessionId: number,
  participants: TrainingParticipantName[]
) {
  await execute(`DELETE FROM training_session_participants WHERE session_id = ?`, [sessionId]);
  for (const person of participants) {
    await execute(
      `
        INSERT INTO training_session_participants (session_id, participant_name_en, participant_name_cn)
        VALUES (?, ?, ?)
      `,
      [sessionId, person.nameEn, person.nameCn]
    );
  }
  await upsertParticipantsMaster(participants);
}

export async function assertDivisionExists(divisionId: number): Promise<boolean> {
  const rows = await query<{ id: number }[]>(
    `SELECT id FROM divisions WHERE id = ? LIMIT 1`,
    [divisionId]
  );
  return Boolean(rows[0]);
}
