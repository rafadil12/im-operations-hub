import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { execute, query } from "@/lib/db";
import { isValidCnText } from "@/lib/daily-operation/mesRecordValidation";
import type { SparepartCategory } from "@/lib/types";

export async function GET() {
  const gate = await requireAnyPermission([
    PERMISSIONS.sparepartStockView,
    PERMISSIONS.sparepartMaterialsRead,
    PERMISSIONS.sparepartMaterialsCreate,
    PERMISSIONS.sparepartMaterialsUpdate,
    PERMISSIONS.sparepartMaterialsImport,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const rows = await query<SparepartCategory[]>(
      `SELECT id, code, name_en, name_cn, sort_order, is_active, created_at, updated_at
       FROM sparepart_categories
       WHERE is_active = 1
       ORDER BY sort_order ASC, code ASC`
    );
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/categories failed", error);
    return NextResponse.json({ error: "Failed to load categories." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartMaterialsCreate);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = (await request.json()) as {
      code?: string;
      name_en?: string;
      name_cn?: string;
    };
    const code = String(body.code ?? "").trim().toUpperCase();
    const name_en = String(body.name_en ?? "").trim();
    const name_cn = String(body.name_cn ?? "").trim();
    if (!code || !/^[A-Z]{1,3}$/.test(code)) {
      return NextResponse.json(
        { error: "Category code is required (1–3 letters A–Z)." },
        { status: 400 }
      );
    }
    if (!name_en || !name_cn) {
      return NextResponse.json(
        { error: "Category name EN and CN are required." },
        { status: 400 }
      );
    }
    if (!isValidCnText(name_cn)) {
      return NextResponse.json(
        { error: "Category name CN must include Chinese characters." },
        { status: 400 }
      );
    }

    const maxRows = await query<{ max_sort: number | null }[]>(
      `SELECT MAX(sort_order) AS max_sort FROM sparepart_categories`
    );
    const sortOrder = Number(maxRows[0]?.max_sort ?? 0) + 1;

    try {
      const result = await execute(
        `INSERT INTO sparepart_categories (code, name_en, name_cn, sort_order, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [code, name_en, name_cn, sortOrder]
      );
      const rows = await query<SparepartCategory[]>(
        `SELECT id, code, name_en, name_cn, sort_order, is_active, created_at, updated_at
         FROM sparepart_categories WHERE id = ? LIMIT 1`,
        [result.insertId]
      );
      return NextResponse.json({ row: rows[0] }, { status: 201 });
    } catch (err) {
      const dup = (err as { code?: string }).code;
      if (dup === "ER_DUP_ENTRY") {
        return NextResponse.json({ error: `Category code "${code}" already exists.` }, { status: 409 });
      }
      throw err;
    }
  } catch (error) {
    console.error("POST /sparepart/categories failed", error);
    return NextResponse.json({ error: "Failed to create category." }, { status: 500 });
  }
}
