import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { withTransaction } from "@/lib/db";
import {
  ITSM_IMPORT_MAX_BYTES,
  ITSM_IMPORT_MAX_ROWS,
  parseItsmRequestWorkbook,
  type ItsmImportRow,
  type ItsmImportRowError,
} from "@/lib/itsm/requestImport";

export const runtime = "nodejs";

const ID_BATCH_SIZE = 500;

const UPDATE_SQL = `
  UPDATE itsm_requests SET
    subject = ?,
    requester = ?,
    technician = ?,
    due_by_date = ?,
    status = ?,
    created_date = ?,
    site = ?,
    priority = ?,
    group_name = ?,
    is_service_request = ?
  WHERE request_id = ?
`;

const INSERT_SQL = `
  INSERT INTO itsm_requests (
    request_id,
    subject,
    requester,
    technician,
    due_by_date,
    status,
    created_date,
    site,
    priority,
    group_name,
    is_service_request
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
`;

function rowParams(row: ItsmImportRow): unknown[] {
  return [
    row.subject,
    row.requester,
    row.technician,
    row.due_by_date,
    row.status,
    row.created_date,
    row.site,
    row.priority,
    row.group_name,
    row.is_service_request ? 1 : 0,
  ];
}

async function loadExistingRequestIds(conn: PoolConnection, ids: number[]): Promise<Set<number>> {
  const existing = new Set<number>();
  if (!ids.length) return existing;

  for (let i = 0; i < ids.length; i += ID_BATCH_SIZE) {
    const batch = ids.slice(i, i + ID_BATCH_SIZE);
    const placeholders = batch.map(() => "?").join(",");
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT DISTINCT request_id FROM itsm_requests WHERE request_id IN (${placeholders})`,
      batch
    );
    for (const row of rows) {
      const id = Number(row.request_id);
      if (Number.isFinite(id)) existing.add(id);
    }
  }

  return existing;
}

async function dedupeExistingRequestIds(conn: PoolConnection, ids: number[]): Promise<void> {
  if (!ids.length) return;

  for (let i = 0; i < ids.length; i += ID_BATCH_SIZE) {
    const batch = ids.slice(i, i + ID_BATCH_SIZE);
    const placeholders = batch.map(() => "?").join(",");
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT request_id, COUNT(*) AS cnt
       FROM itsm_requests
       WHERE request_id IN (${placeholders})
       GROUP BY request_id
       HAVING COUNT(*) > 1`,
      batch
    );

    for (const row of rows) {
      const requestId = Number(row.request_id);
      const count = Number(row.cnt);
      if (!Number.isFinite(requestId) || !Number.isFinite(count) || count <= 1) {
        continue;
      }
      await conn.query(
        `DELETE FROM itsm_requests
         WHERE request_id = ?
           AND id NOT IN (
             SELECT id FROM (
               SELECT MAX(id) AS id FROM itsm_requests WHERE request_id = ?
             ) keep_row
           )`,
        [requestId, requestId]
      );
    }
  }
}

export async function POST(req: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.itsmRequestImport);
  if (gate instanceof NextResponse) return gate;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Please upload an Excel (.xlsx) file.",
          errors: [] as ItsmImportRowError[],
        },
        { status: 400 }
      );
    }

    if (file.size > ITSM_IMPORT_MAX_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large. Maximum size is ${Math.round(ITSM_IMPORT_MAX_BYTES / (1024 * 1024))}MB.`,
          errors: [] as ItsmImportRowError[],
        },
        { status: 400 }
      );
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx")) {
      return NextResponse.json(
        {
          error: "Only .xlsx files are supported.",
          errors: [] as ItsmImportRowError[],
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseItsmRequestWorkbook(buffer);

    if (!parsed.ok) {
      return NextResponse.json(
        {
          error: "Import failed. Fix the errors below and try again. No records were saved.",
          errors: parsed.errors,
        },
        { status: 400 }
      );
    }

    if (parsed.rows.length > ITSM_IMPORT_MAX_ROWS) {
      return NextResponse.json(
        {
          error: `Too many rows. Maximum is ${ITSM_IMPORT_MAX_ROWS}.`,
          errors: [] as ItsmImportRowError[],
        },
        { status: 400 }
      );
    }

    const result = await withTransaction(async (conn) => {
      const importIds = parsed.rows.map((row) => row.request_id);
      const existingIds = await loadExistingRequestIds(conn, importIds);

      const toUpdate: ItsmImportRow[] = [];
      const toInsert: ItsmImportRow[] = [];

      for (const row of parsed.rows) {
        if (existingIds.has(row.request_id)) {
          toUpdate.push(row);
        } else {
          toInsert.push(row);
        }
      }

      await dedupeExistingRequestIds(
        conn,
        toUpdate.map((row) => row.request_id)
      );

      for (const row of toUpdate) {
        await conn.query(UPDATE_SQL, [...rowParams(row), row.request_id]);
      }

      for (const row of toInsert) {
        await conn.query(INSERT_SQL, [row.request_id, ...rowParams(row)]);
      }

      return {
        imported: toInsert.length,
        updated: toUpdate.length,
      };
    });

    return NextResponse.json({
      success: true,
      imported: result.imported,
      updated: result.updated,
      headerRow: parsed.headerRow,
      total: parsed.rows.length,
    });
  } catch (err) {
    console.error("POST /api/itsm/itsm-request/import failed", err);

    return NextResponse.json(
      {
        error: "Import failed.",
        errors: [] as ItsmImportRowError[],
      },
      { status: 500 }
    );
  }
}
