import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import type { SparepartStockBalance } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
  const gate = await requireAnyPermission([
    PERMISSIONS.sparepartMaterialsRead,
    PERMISSIONS.sparepartStockView,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await context.params;
    const itemId = Number(id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }

    const balances = await query<SparepartStockBalance[]>(
      `SELECT b.id, b.item_id, b.storage_location_id, b.qty, b.updated_at,
              loc.code AS location_code, loc.name AS location_name
       FROM sparepart_stock_balances b
       JOIN sparepart_storage_locations loc ON loc.id = b.storage_location_id
       WHERE b.item_id = ? AND b.qty > 0
       ORDER BY loc.name ASC`,
      [itemId],
    );

    return NextResponse.json({ balances });
  } catch (error) {
    console.error("GET /sparepart/materials/[id]/balances failed", error);
    return NextResponse.json(
      { error: "Failed to load balances." },
      { status: 500 },
    );
  }
}
