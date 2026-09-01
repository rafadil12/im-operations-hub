import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
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
