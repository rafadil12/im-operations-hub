import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
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
import { ensureStorageLocation } from "@/lib/sparepartLocations";

export const runtime = "nodejs";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function nowLocalDateTime(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(
    now.getHours(),
  )}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
}

async function nextDocNumber(
  conn: PoolConnection,
  postingDate: string,
): Promise<string> {
  const ymd = postingDate.slice(0, 10).replaceAll("-", "");
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
  const gate = await requirePermission(PERMISSIONS.sparepartMaterialsImport);
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

    // Pre-validate locations (single string; required when importing stock qty)
    const locationErrors: ImportRowError[] = [];
    for (const item of parsed.items) {
      const loc = (item.location || "").trim();
      if (loc.includes(",")) {
        locationErrors.push({
          row: 0,
          message: `${item.code}: location must be a single location (no commas).`,
        });
      }
      if (item.stock_current > 0 && !loc) {
        locationErrors.push({
          row: 0,
          message: `${item.code}: location is required when stock quantity is greater than 0.`,
        });
      }
    }
    if (locationErrors.length) {
      return NextResponse.json(
        {
          error: "Import validation failed.",
          errors: locationErrors,
        },
        { status: 400 },
      );
    }

    const postingDate = nowLocalDateTime();

    const imported = await withTransaction(async (conn) => {
      let count = 0;
      const grLines: {
        itemId: number;
        qty: number;
        locationId: number;
        locationLabel: string;
      }[] = [];

      for (const item of parsed.items) {
        let stockLocId: number | null = null;
        let locationName: string | null = null;
        if (item.location?.trim()) {
          const loc = await ensureStorageLocation(conn, item.location.trim());
          stockLocId = loc.id;
          locationName = loc.name;
        }

        await conn.query(
          `INSERT INTO sparepart_items
            (code, name, brand, model, notes, stock_in, stock_out, stock_current)
           VALUES (?, ?, ?, ?, ?, 0, 0, 0)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             brand = VALUES(brand),
             model = VALUES(model),
             notes = VALUES(notes),
             deleted_at = NULL`,
          [
            item.code,
            item.name,
            item.brand || null,
            item.model || null,
            item.notes || null,
          ],
        );

        const [rows] = await conn.query<RowDataPacket[]>(
          `SELECT id FROM sparepart_items WHERE code = ? LIMIT 1`,
          [item.code],
        );
        const itemId = Number(rows[0]?.id);
        if (!itemId) continue;

        // Reset stock aggregates and balances for this item
        await conn.query(
          `UPDATE sparepart_items
           SET stock_in = 0, stock_out = 0, stock_current = 0
           WHERE id = ?`,
          [itemId],
        );
        await conn.query(
          `DELETE FROM sparepart_stock_balances WHERE item_id = ?`,
          [itemId],
        );

        if (item.stock_current > 0 && stockLocId && locationName) {
          grLines.push({
            itemId,
            qty: item.stock_current,
            locationId: stockLocId,
            locationLabel: `${(await ensureStorageLocation(conn, locationName)).code} — ${locationName}`,
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
              (doc_id, item_id, line_no, qty, storage_location, storage_location_id, note)
             VALUES (?, ?, ?, ?, ?, ?, NULL)`,
            [
              docId,
              line.itemId,
              lineNo,
              line.qty,
              line.locationLabel,
              line.locationId,
            ],
          );
          await conn.query(
            `INSERT INTO sparepart_stock_balances (item_id, storage_location_id, qty)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)`,
            [line.itemId, line.locationId, line.qty],
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
    const message =
      error instanceof Error ? error.message : "Import failed. No records were saved.";
    return NextResponse.json(
      {
        error: message,
        errors: [] as ImportRowError[],
      },
      { status: 500 },
    );
  }
}
