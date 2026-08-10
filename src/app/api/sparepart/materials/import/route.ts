import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import type { RowDataPacket } from "mysql2/promise";
import { withTransaction } from "@/lib/db";
import {
  IMPORT_MAX_BYTES,
  parseSparepartItemsWorkbook,
  type ImportRowError,
} from "@/lib/sparepartImport";

export const runtime = "nodejs";

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

    const imported = await withTransaction(async (conn) => {
      let count = 0;

      for (const item of parsed.items) {
        await conn.query(
          `INSERT INTO sparepart_items
            (code, name, brand, model, notes, stock_current)
           VALUES (?, ?, ?, ?, ?, 0)
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
        if (rows[0]?.id) count += 1;
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
