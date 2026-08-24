import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
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
       ORDER BY sort_order ASC, code ASC`,
    );
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/uoms failed", error);
    return NextResponse.json({ error: "Failed to load UoM." }, { status: 500 });
  }
}
