import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import type { SparepartStockLevel } from "@/lib/types";

export async function GET() {
  const gate = await requireAnyPermission([
    PERMISSIONS.sparepartStockView,
    PERMISSIONS.sparepartMaterialsRead,
    PERMISSIONS.sparepartDocumentPost,
    PERMISSIONS.sparepartDocumentRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const rows = await query<SparepartStockLevel[]>(
      `SELECT id, code, name_en, name_cn, sort_order, is_active
       FROM sparepart_stock_levels
       WHERE is_active = 1
       ORDER BY sort_order ASC, code ASC`
    );
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/levels failed", error);
    return NextResponse.json({ error: "Failed to load storage levels." }, { status: 500 });
  }
}
