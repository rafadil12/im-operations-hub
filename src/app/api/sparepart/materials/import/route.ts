import { NextRequest, NextResponse } from "next/server";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { withTransaction } from "@/lib/db";
import {
  IMPORT_MAX_BYTES,
  parseSparepartItemsWorkbook,
  type ImportRowError,
} from "@/lib/sparepartImport";

export const runtime = "nodejs";

async function nextDocNumber(
  conn: PoolConnection,
  postingDate: string,
): Promise<string> {
  const ymd = postingDate.replaceAll("-", "");
  const prefix = `MD${ymd}`;
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT doc_number FROM sparepart_mat_docs
     WHERE doc_number LIKE ?
     ORDER BY doc_number DESC
     LIMIT 1
     FOR UPDATE`,
    [`${prefix}%`],
  );
  const last = rows[0]?.doc_number as string | undefined;
  let seq = 1;
  if (last && last.length >= prefix.length + 4) {
    const n = Number(last.slice(prefix.length));
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Please upload an Excel (.xlsx) file.",
          errors: [] as ImportRowError[],
        },
        { status: 400 },
      );
    }

    if (file.size > IMPORT_MAX_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large. Maximum size is ${Math.round(IMPORT_MAX_BYTES / (1024 * 1024))}MB.`,
          errors: [] as ImportRowError[],
        },
        { status: 400 },
      );
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json(
        {
          error: "Only .xlsx files are supported.",
          errors: [] as ImportRowError[],
        },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const parsed = await parseSparepartItemsWorkbook(buffer);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, errors: parsed.errors },
        { status: 400 },
      );
    }

    const postingDate = new Date().toISOString().slice(0, 10);

    const imported = await withTransaction(async (conn) => {
      let count = 0;
      const grLines: {
        itemId: number;
        qty: number;
        location: string | null;
      }[] = [];

      for (const item of parsed.items) {
        // Upsert master with zero stock; stock applied via GR doc below
        await conn.query(
          `INSERT INTO sparepart_items
            (code, name, brand, model, location, notes, stock_in, stock_out, stock_current)
           VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             brand = VALUES(brand),
             model = VALUES(model),
             location = VALUES(location),
             notes = VALUES(notes),
             deleted_at = NULL`,
          [
            item.code,
            item.name,
            item.brand || null,
            item.model || null,
            item.location || null,
            item.notes || null,
          ],
        );

        const [rows] = await conn.query<RowDataPacket[]>(
          `SELECT id FROM sparepart_items WHERE code = ? LIMIT 1`,
          [item.code],
        );
        const itemId = Number(rows[0]?.id);
        if (!itemId) continue;

        // Reset stock aggregates then rebuild from GR for this import row
        await conn.query(
          `UPDATE sparepart_items
           SET stock_in = 0, stock_out = 0, stock_current = 0
           WHERE id = ?`,
          [itemId],
        );

        if (item.stock_current > 0) {
          grLines.push({
            itemId,
            qty: item.stock_current,
            location: item.location || null,
          });
        }
        count += 1;
      }

      if (grLines.length > 0) {
        const docNumber = await nextDocNumber(conn, postingDate);
        const [docResult] = await conn.query<ResultSetHeader>(
          `INSERT INTO sparepart_mat_docs
            (doc_number, movement_type, posting_date, header_text, recipient)
           VALUES (?, '101', ?, ?, NULL)`,
          [docNumber, postingDate, "Initial stock from Excel import"],
        );
        const docId = docResult.insertId;
        let lineNo = 0;
        for (const line of grLines) {
          lineNo += 1;
          await conn.query(
            `INSERT INTO sparepart_mat_doc_items
              (doc_id, item_id, line_no, qty, storage_location, note)
             VALUES (?, ?, ?, ?, ?, NULL)`,
            [docId, line.itemId, lineNo, line.qty, line.location],
          );
          await conn.query(
            `UPDATE sparepart_items
             SET stock_in = stock_in + ?, stock_current = stock_current + ?
             WHERE id = ?`,
            [line.qty, line.qty, line.itemId],
          );
        }
      }

      return count;
    });

    return NextResponse.json({ imported });
  } catch (error) {
    console.error("POST /sparepart/materials/import failed", error);
    return NextResponse.json(
      {
        error: "Import failed. No records were saved.",
        errors: [] as ImportRowError[],
      },
      { status: 500 },
    );
  }
}
