import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "@/lib/db";

export type ReportProjectAttachment = {
  id: number;
  reportId: number;
  originalName: string;
  url: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
};

type AttachmentRow = RowDataPacket & {
  id: number;
  report_id: number;
  original_name: string;
  stored_name: string;
  file_url: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: Date | string;
};

function mapAttachmentRow(row: AttachmentRow): ReportProjectAttachment {
  return {
    id: Number(row.id),
    reportId: Number(row.report_id),
    originalName: row.original_name,
    url: row.file_url,
    mimeType: row.mime_type,
    size: row.file_size != null ? Number(row.file_size) : null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export async function loadProjectAttachments(
  reportId: number
): Promise<ReportProjectAttachment[]> {
  const rows = await query<AttachmentRow[]>(
    `SELECT id, report_id, original_name, stored_name, file_url, mime_type, file_size, created_at
     FROM report_project_attachments
     WHERE report_id = ?
     ORDER BY created_at ASC, id ASC`,
    [reportId]
  );
  return rows.map(mapAttachmentRow);
}

export async function insertProjectAttachment(input: {
  reportId: number;
  originalName: string;
  storedName: string;
  fileUrl: string;
  mimeType: string | null;
  size: number;
  uploadedBySystemUserId?: number | null;
}): Promise<ReportProjectAttachment> {
  const result = await execute(
    `INSERT INTO report_project_attachments
       (report_id, original_name, stored_name, file_url, mime_type, file_size, uploaded_by_system_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.reportId,
      input.originalName,
      input.storedName,
      input.fileUrl,
      input.mimeType,
      input.size,
      input.uploadedBySystemUserId ?? null,
    ]
  );

  const rows = await query<AttachmentRow[]>(
    `SELECT id, report_id, original_name, stored_name, file_url, mime_type, file_size, created_at
     FROM report_project_attachments WHERE id = ? LIMIT 1`,
    [result.insertId]
  );

  const row = rows[0];
  if (!row) throw new Error("Failed to load saved attachment.");
  return mapAttachmentRow(row);
}

export async function getProjectAttachmentById(id: number): Promise<AttachmentRow | null> {
  const rows = await query<AttachmentRow[]>(
    `SELECT id, report_id, original_name, stored_name, file_url, mime_type, file_size, created_at
     FROM report_project_attachments WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function deleteProjectAttachment(id: number): Promise<void> {
  await execute(`DELETE FROM report_project_attachments WHERE id = ?`, [id]);
}
