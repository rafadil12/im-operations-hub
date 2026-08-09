import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import type { SparepartStockBalanceRow } from "@/lib/types";

type SummaryRow = {
  total_items: number;
  zero_stock: number;
  total_current: number;
};

type LocRow = { code: string; name: string };

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartStockView);
  if (gate instanceof NextResponse) return gate;

  try {
    const sp = request.nextUrl.searchParams;
    const conditions: string[] = ["i.deleted_at IS NULL"];
    const params: unknown[] = [];

    const q = sp.get("q")?.trim();
    if (q) {
      conditions.push(
        `(i.code LIKE ? OR i.name LIKE ? OR i.brand LIKE ? OR i.model LIKE ?)`,
      );
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    const location = sp.get("location")?.trim();
    if (location) {
      conditions.push(
        `EXISTS (
           SELECT 1 FROM sparepart_stock_balances b
           JOIN sparepart_storage_locations loc ON loc.id = b.storage_location_id
           WHERE b.item_id = i.id AND (loc.code = ? OR loc.name = ?)
         )`,
      );
      params.push(location, location);
    }

    if (sp.get("lowStock") === "1") {
      conditions.push("i.stock_current <= 0");
    }

    const where = conditions.join(" AND ");
    const rows = await query<SparepartStockBalanceRow[]>(
      `SELECT
         i.id AS item_id,
         i.code,
         i.name,
         i.brand,
         i.model,
         i.stock_current,
         i.stock_in,
         i.stock_out,
         i.notes
       FROM sparepart_items i
       WHERE ${where}
       ORDER BY i.code ASC`,
      params,
    );

    const [summary] = await query<SummaryRow[]>(
      `SELECT
         COUNT(DISTINCT i.id) AS total_items,
         SUM(CASE WHEN i.stock_current <= 0 THEN 1 ELSE 0 END) AS zero_stock,
         COALESCE(SUM(i.stock_current), 0) AS total_current
       FROM sparepart_items i
       WHERE i.deleted_at IS NULL`,
    );

    const locations = await query<LocRow[]>(
      `SELECT code, name
       FROM sparepart_storage_locations
       WHERE is_active = 1
       ORDER BY name ASC`,
    );

    return NextResponse.json({
      rows,
      summary: {
        totalItems: Number(summary?.total_items ?? 0),
        zeroStock: Number(summary?.zero_stock ?? 0),
        totalCurrent: Number(summary?.total_current ?? 0),
      },
      locations: locations.map((r) => r.code),
      locationOptions: locations,
    });
  } catch (error) {
    console.error("GET /sparepart/stock failed", error);
    return NextResponse.json(
      { error: "Failed to load stock overview." },
      { status: 500 },
    );
  }
}
