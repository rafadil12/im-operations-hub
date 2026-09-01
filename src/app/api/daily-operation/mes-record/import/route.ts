import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import type { PoolConnection, ResultSetHeader } from "mysql2/promise";
import { query, withTransaction } from "@/lib/db";
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  parseActivitiesWorkbook,
  type ImportRowError,
} from "@/lib/daily-operation/mesRecordImport";
import { loadMasters } from "@/lib/masters";
import type { MesDataInput, MesDataRow } from "@/lib/types";
import { notifyMesRecordsCreated } from "@/lib/wecomNotification";

export const runtime = "nodejs";

const INSERT_SQL = `INSERT INTO mes_record
  (user_id, division_id, category_id, subcategory_id,
   description_cn, description_en, solution_cn, solution_en,
   type_id, status_id, start_time, end_time)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const RECORDS_BY_IDS_SQL = `
  SELECT
    m.*,
    u.name_en AS pic_en,
    u.name_cn AS pic_cn,
    d.name_en AS division_en,
    d.name_cn AS division_cn,
    c.name_en AS category_en,
    c.name_cn AS category_cn,
    s.name_en AS subcategory_en,
    s.name_cn AS subcategory_cn,
    t.name_en AS type_en,
    t.name_cn AS type_cn,
    st.name_en AS status_en,
    st.name_cn AS status_cn
  FROM mes_record m
  LEFT JOIN users u ON m.user_id = u.id
  LEFT JOIN divisions d ON m.division_id = d.id
  LEFT JOIN categories c ON m.category_id = c.id
  LEFT JOIN subcategories s ON m.subcategory_id = s.id
  LEFT JOIN mes_type t ON m.type_id = t.id
  LEFT JOIN mes_status st ON m.status_id = st.id
  WHERE m.id IN (?)
  ORDER BY FIELD(m.id, ?)
`;

async function insertRow(conn: PoolConnection, data: MesDataInput): Promise<number> {
  const [result] = await conn.query<ResultSetHeader>(INSERT_SQL, [
    data.user_id,
    data.division_id,
    data.category_id,
    data.subcategory_id,
    data.description_cn,
    data.description_en,
    data.solution_cn,
    data.solution_en,
    data.type_id,
    data.status_id,
    data.start_time,
    data.end_time,
  ]);
  return result.insertId;
}

export async function POST(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.dailyRecordImport);
  if (gate instanceof NextResponse) return gate;

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Please upload an Excel (.xlsx) file.",
          errors: [] as ImportRowError[],
        },
        { status: 400 }
      );
    }

    if (file.size > IMPORT_MAX_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large. Maximum size is ${Math.round(IMPORT_MAX_BYTES / (1024 * 1024))}MB.`,
          errors: [] as ImportRowError[],
        },
        { status: 400 }
      );
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx")) {
      return NextResponse.json(
        {
          error: "Only .xlsx files are supported.",
          errors: [] as ImportRowError[],
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const masters = await loadMasters();
    const parsed = await parseActivitiesWorkbook(buffer, masters);

    if (!parsed.ok) {
      return NextResponse.json(
        {
          error: "Import failed. Fix the errors below and try again. No records were saved.",
          errors: parsed.errors,
        },
        { status: 400 }
      );
    }

    if (parsed.rows.length > IMPORT_MAX_ROWS) {
      return NextResponse.json(
        {
          error: `Too many rows. Maximum is ${IMPORT_MAX_ROWS}.`,
          errors: [] as ImportRowError[],
        },
        { status: 400 }
      );
    }

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        {
          error: "No data rows found in the file.",
          errors: [] as ImportRowError[],
        },
        { status: 400 }
      );
    }

    const insertIds = await withTransaction(async (conn) => {
      const ids: number[] = [];
      for (const row of parsed.rows) {
        ids.push(await insertRow(conn, row));
      }
      return ids;
    });

    // Best-effort WeCom: after commit, one notification per activity.
    // Failures must not undo a successful import.
    try {
      if (insertIds.length > 0) {
        const records = await query<MesDataRow[]>(RECORDS_BY_IDS_SQL, [insertIds, insertIds]);
        await notifyMesRecordsCreated(records);
      }
    } catch (wecomError) {
      console.error("Failed to send WeCom notifications after import:", wecomError);
    }

    return NextResponse.json({ imported: parsed.rows.length });
  } catch (error) {
    console.error("POST /mes-record/import failed", error);
    return NextResponse.json(
      { error: "Failed to import records.", errors: [] as ImportRowError[] },
      { status: 500 }
    );
  }
}
