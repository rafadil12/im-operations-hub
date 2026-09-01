import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "@/lib/db";
import type { ReportWeekAttachment } from "./types";

type AttachmentRow = RowDataPacket & {
  id: number;
  week_id: number;
  area_id: number;
  original_name: string;
  stored_name: string;
  file_url: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: Date | string;
};

function mapAttachmentRow(row: AttachmentRow): ReportWeekAttachment {
  return {
    id: Number(row.id),
    weekId: Number(row.week_id),
    areaId: Number(row.area_id),
    originalName: row.original_name,
    url: row.file_url,
    mimeType: row.mime_type,
    size: row.file_size != null ? Number(row.file_size) : null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export async function loadReportAttachmentsByYear(
  year: number,
  areaId?: number
): Promise<ReportWeekAttachment[]> {
  const params: (number | string)[] = [year];
  let areaClause = "";
  if (areaId != null) {
    areaClause = " AND rwa.area_id = ?";
    params.push(areaId);
  }

  const rows = await query<AttachmentRow[]>(
    `SELECT rwa.id, rwa.week_id, rwa.area_id, rwa.original_name, rwa.stored_name,
            rwa.file_url, rwa.mime_type, rwa.file_size, rwa.created_at
     FROM report_week_attachments rwa
     JOIN report_weeks rw ON rw.id = rwa.week_id
     WHERE rw.year = ?${areaClause}
     ORDER BY rw.week_number DESC, rwa.area_id ASC, rwa.created_at ASC, rwa.id ASC`,
    params
  );
  return rows.map(mapAttachmentRow);
}

export async function loadReportWeekAttachments(
  weekId: number,
  areaId: number
): Promise<ReportWeekAttachment[]> {
  const rows = await query<AttachmentRow[]>(
    `SELECT id, week_id, area_id, original_name, stored_name, file_url, mime_type, file_size, created_at
     FROM report_week_attachments
     WHERE week_id = ? AND area_id = ?
     ORDER BY created_at ASC, id ASC`,
    [weekId, areaId]
  );
  return rows.map(mapAttachmentRow);
}

export async function insertReportWeekAttachment(input: {
  weekId: number;
  areaId: number;
  originalName: string;
  storedName: string;
  fileUrl: string;
  mimeType: string | null;
  size: number;
  uploadedBySystemUserId?: number | null;
}): Promise<ReportWeekAttachment> {
  const result = await execute(
    `INSERT INTO report_week_attachments
       (week_id, area_id, original_name, stored_name, file_url, mime_type, file_size, uploaded_by_system_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.weekId,
      input.areaId,
      input.originalName,
      input.storedName,
      input.fileUrl,
      input.mimeType,
      input.size,
      input.uploadedBySystemUserId ?? null,
    ]
  );

  const rows = await query<AttachmentRow[]>(
    `SELECT id, week_id, area_id, original_name, stored_name, file_url, mime_type, file_size, created_at
     FROM report_week_attachments WHERE id = ? LIMIT 1`,
    [result.insertId]
  );

  const row = rows[0];
  if (!row) throw new Error("Failed to load saved attachment.");
  return mapAttachmentRow(row);
}

export async function getReportWeekAttachmentById(id: number): Promise<AttachmentRow | null> {
  const rows = await query<AttachmentRow[]>(
    `SELECT id, week_id, area_id, original_name, stored_name, file_url, mime_type, file_size, created_at
     FROM report_week_attachments WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function deleteReportWeekAttachment(id: number): Promise<void> {
  await execute(`DELETE FROM report_week_attachments WHERE id = ?`, [id]);
}
