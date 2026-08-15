import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import { LOW_STOCK_SQL } from "@/lib/sparepartCategories";
import type { SparepartStockBalanceRow } from "@/lib/types";

type SummaryRow = {
  total_items: number;
  zero_stock: number;
  low_stock: number;
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
        `(i.code LIKE ? OR i.name_en LIKE ? OR i.name_cn LIKE ?
          OR i.brand_en LIKE ? OR i.brand_cn LIKE ? OR i.model LIKE ?)`,
      );
      const like = `%${q}%`;
      params.push(like, like, like, like, like, like);
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

    const category = sp.get("category")?.trim();
    if (category) {
      conditions.push("c.code = ?");
      params.push(category.toUpperCase());
    }

    if (sp.get("lowStock") === "1") {
      conditions.push(LOW_STOCK_SQL);
    }

    const where = conditions.join(" AND ");
    const rows = await query<SparepartStockBalanceRow[]>(
      `SELECT
         i.id AS item_id,
         i.code,
         i.name_en,
         i.name_cn,
         i.brand_en,
         i.brand_cn,
         i.model,
         i.stock_current,
         i.min_stock,
         i.is_active,
         i.category_id,
         c.code AS category_code,
         c.name_en AS category_name_en,
         c.name_cn AS category_name_cn,
         i.uom_id,
         u.code AS uom_code,
         i.notes
       FROM sparepart_items i
       JOIN sparepart_categories c ON c.id = i.category_id
       JOIN uoms u ON u.id = i.uom_id
       WHERE ${where}
       ORDER BY i.code ASC`,
      params,
    );

    const [summary] = await query<SummaryRow[]>(
      `SELECT
         COUNT(DISTINCT i.id) AS total_items,
         SUM(CASE WHEN i.stock_current <= 0 THEN 1 ELSE 0 END) AS zero_stock,
         SUM(CASE WHEN ${LOW_STOCK_SQL} THEN 1 ELSE 0 END) AS low_stock,
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
        lowStock: Number(summary?.low_stock ?? 0),
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
