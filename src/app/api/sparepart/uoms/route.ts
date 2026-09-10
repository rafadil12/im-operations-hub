import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { execute, query } from "@/lib/db";
import type { SparepartUom } from "@/lib/types";

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
    const rows = await query<SparepartUom[]>(
      `SELECT id, code, name_en, name_cn, sort_order, is_active, created_at, updated_at
       FROM uoms
       WHERE is_active = 1
       ORDER BY sort_order ASC, code ASC`
    );
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/uoms failed", error);
    return NextResponse.json({ error: "Failed to load UoM." }, { status: 500 });
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
    if (!code || !/^[A-Z0-9]{1,16}$/.test(code)) {
      return NextResponse.json(
        { error: "UoM code is required (letters/numbers, max 16)." },
        { status: 400 }
      );
    }
    if (!name_en || !name_cn) {
      return NextResponse.json({ error: "UoM name EN and CN are required." }, { status: 400 });
    }

    const maxRows = await query<{ max_sort: number | null }[]>(
      `SELECT MAX(sort_order) AS max_sort FROM uoms`
    );
    const sortOrder = Number(maxRows[0]?.max_sort ?? 0) + 1;

    try {
      const result = await execute(
        `INSERT INTO uoms (code, name_en, name_cn, sort_order, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [code, name_en, name_cn, sortOrder]
      );
      const rows = await query<SparepartUom[]>(
        `SELECT id, code, name_en, name_cn, sort_order, is_active, created_at, updated_at
         FROM uoms WHERE id = ? LIMIT 1`,
        [result.insertId]
      );
      return NextResponse.json({ row: rows[0] }, { status: 201 });
    } catch (err) {
      const dup = (err as { code?: string }).code;
      if (dup === "ER_DUP_ENTRY") {
        return NextResponse.json({ error: `UoM code "${code}" already exists.` }, { status: 409 });
      }
      throw err;
    }
  } catch (error) {
    console.error("POST /sparepart/uoms failed", error);
    return NextResponse.json({ error: "Failed to create UoM." }, { status: 500 });
  }
}
