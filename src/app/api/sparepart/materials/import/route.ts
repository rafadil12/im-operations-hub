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
import { DEFAULT_SPAREPART_CATEGORY_CODE } from "@/lib/sparepartCategories";
import type { SparepartCategory } from "@/lib/types";

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
      const [catRows] = await conn.query(
        `SELECT id, code FROM sparepart_categories WHERE is_active = 1`,
      );
      const categoryIdByCode = new Map(
        (catRows as SparepartCategory[]).map((row) => [
          String(row.code).toUpperCase(),
          Number(row.id),
        ]),
      );
      const fallbackCategoryId =
        categoryIdByCode.get(DEFAULT_SPAREPART_CATEGORY_CODE) ?? null;
      if (fallbackCategoryId == null) {
        throw new Error("IT category is missing. Run database migrations.");
      }

      let count = 0;

      for (const item of parsed.items) {
        const categoryId =
          categoryIdByCode.get(item.category_code) ?? fallbackCategoryId;
        await conn.query(
          `INSERT INTO sparepart_items
            (code, name_en, name_cn, brand_en, brand_cn, model, notes,
             stock_current, min_stock, category_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
           ON DUPLICATE KEY UPDATE
             name_en = VALUES(name_en),
             name_cn = VALUES(name_cn),
             brand_en = VALUES(brand_en),
             brand_cn = VALUES(brand_cn),
             model = VALUES(model),
             notes = VALUES(notes),
             min_stock = VALUES(min_stock),
             category_id = VALUES(category_id),
             deleted_at = NULL`,
          [
            item.code,
            item.name_en || null,
            item.name_cn || null,
            item.brand_en || null,
            item.brand_cn || null,
            item.model || null,
            item.notes || null,
            item.min_stock,
            categoryId,
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
