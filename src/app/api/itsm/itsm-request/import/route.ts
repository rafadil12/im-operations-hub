import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import type { ResultSetHeader } from "mysql2/promise";
import { withTransaction } from "@/lib/db";
import {
  ITSM_IMPORT_MAX_BYTES,
  ITSM_IMPORT_MAX_ROWS,
  parseItsmRequestWorkbook,
  type ItsmImportRow,
  type ItsmImportRowError,
} from "@/lib/itsm/requestImport";

export const runtime = "nodejs";

const UPSERT_BATCH_SIZE = 100;

const UPSERT_SQL = `
  INSERT INTO itsm_requests (
    request_id,
    subject,
    requester,
    technician,
    due_by_date,
    due_at,
    status,
    created_date,
    created_at,
    site,
    priority,
    group_name,
    is_service_request
  ) VALUES ?
  ON DUPLICATE KEY UPDATE
    subject = VALUES(subject),
    requester = VALUES(requester),
    technician = VALUES(technician),
    due_by_date = VALUES(due_by_date),
    due_at = VALUES(due_at),
    status = VALUES(status),
    created_date = VALUES(created_date),
    created_at = VALUES(created_at),
    site = VALUES(site),
    priority = VALUES(priority),
    group_name = VALUES(group_name),
    is_service_request = VALUES(is_service_request)
`;

function rowValues(row: ItsmImportRow): unknown[] {
  return [
    row.request_id,
    row.subject,
    row.requester,
    row.technician,
    row.due_by_date,
    row.due_at,
    row.status,
    row.created_date,
    row.created_at,
    row.site,
    row.priority,
    row.group_name,
    row.is_service_request ? 1 : 0,
  ];
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
      let imported = 0;
      let updated = 0;

      for (let i = 0; i < parsed.rows.length; i += UPSERT_BATCH_SIZE) {
        const batch = parsed.rows.slice(i, i + UPSERT_BATCH_SIZE);
        const values = batch.map((row) => rowValues(row));
        const [queryResult] = await conn.query<ResultSetHeader>(UPSERT_SQL, [values]);

        const affected = Number(queryResult.affectedRows ?? 0);
        const batchSize = batch.length;
        const batchUpdated = Math.max(0, affected - batchSize);
        updated += batchUpdated;
        imported += batchSize - batchUpdated;
      }

      return { imported, updated };
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
