import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import { STOCK_BALANCE_FROM, STOCK_BALANCE_SELECT } from "@/lib/sparepart/stockBalances";
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
      `SELECT ${STOCK_BALANCE_SELECT}
       FROM ${STOCK_BALANCE_FROM}
       WHERE b.item_id = ? AND b.qty > 0
       ORDER BY loc.name_en ASC, lvl.sort_order ASC`,
      [itemId]
    );

    return NextResponse.json({ balances });
  } catch (error) {
    console.error("GET /sparepart/materials/[id]/balances failed", error);
    return NextResponse.json({ error: "Failed to load balances." }, { status: 500 });
  }
}
