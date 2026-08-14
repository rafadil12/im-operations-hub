import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import type { RowDataPacket } from "mysql2/promise";
import { withTransaction } from "@/lib/db";
import {
  IMPORT_MAX_BYTES,
  parseSparepartItemsWorkbook,
  type ImportRowError,
  type ParsedImportItem,
} from "@/lib/sparepartImport";
import { DEFAULT_SPAREPART_CATEGORY_CODE, normalizeCategoryCode } from "@/lib/sparepartCategories";
import type { SparepartCategory } from "@/lib/types";
import { query } from "@/lib/db";

export const runtime = "nodejs";

function buildCategoryIdByCode(
  categories: SparepartCategory[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of categories) {
    const id = Number(row.id);
    const raw = String(row.code).toUpperCase();
    map.set(raw, id);
    const canonical = normalizeCategoryCode(raw);
    if (canonical) map.set(canonical, id);
  }
  return map;
}

async function loadActiveCategoryIdByCode(): Promise<Map<string, number>> {
  const rows = await query<SparepartCategory[]>(
    `SELECT id, code FROM sparepart_categories WHERE is_active = 1`,
  );
  return buildCategoryIdByCode(rows);
}

async function findActiveDuplicateImportCodes(
  items: ParsedImportItem[],
): Promise<ImportRowError[]> {
  if (items.length === 0) return [];

  const codesUpper = items.map((item) => item.code.toUpperCase());
  const placeholders = codesUpper.map(() => "?").join(", ");
  const rows = await query<RowDataPacket[]>(
    `SELECT code FROM sparepart_items
     WHERE deleted_at IS NULL AND UPPER(code) IN (${placeholders})`,
    codesUpper,
  );

  const existing = new Set(
    rows.map((row: RowDataPacket) => String(row.code).toUpperCase()),
  );
  const errors: ImportRowError[] = [];
  for (const item of items) {
    if (existing.has(item.code.toUpperCase())) {
      errors.push({
        row: item.row,
        field: "code",
        message: "Material code already exists.",
      });
    }
  }
  return errors;
}

function findInvalidImportCategories(
  items: ParsedImportItem[],
  categoryIdByCode: Map<string, number>,
): ImportRowError[] {
  const errors: ImportRowError[] = [];
  for (const item of items) {
    if (categoryIdByCode.has(item.category_code)) continue;
    errors.push({
      row: item.row,
      field: "category",
      message: `Category "${item.category_code}" is not available. Use an active category from the system.`,
    });
  }
  return errors;
}

function resolveImportCategoryId(
  categoryCode: ParsedImportItem["category_code"],
  categoryIdByCode: Map<string, number>,
): number {
  const categoryId = categoryIdByCode.get(categoryCode);
  if (categoryId == null) {
    throw new Error(`Category "${categoryCode}" is not available.`);
  }
  return categoryId;
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

    const categoryIdByCode = await loadActiveCategoryIdByCode();
    if (!categoryIdByCode.has(DEFAULT_SPAREPART_CATEGORY_CODE)) {
      return NextResponse.json(
        {
          error: "IT category is missing. Run database migrations.",
          errors: [] as ImportRowError[],
        },
        { status: 500 },
      );
    }

    const duplicateErrors = await findActiveDuplicateImportCodes(parsed.items);
    const categoryErrors = findInvalidImportCategories(
      parsed.items,
      categoryIdByCode,
    );
    const validationErrors = [...duplicateErrors, ...categoryErrors];
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Import validation failed. No records were saved.",
          errors: validationErrors,
        },
        { status: 400 },
      );
    }

    const imported = await withTransaction(async (conn) => {
      let count = 0;

      for (const item of parsed.items) {
        const categoryId = resolveImportCategoryId(
          item.category_code,
          categoryIdByCode,
        );
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
