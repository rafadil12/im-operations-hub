import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { SparepartItem } from "@/lib/types";

type LocationRow = { location: string };
type SummaryRow = {
  total_items: number;
  zero_stock: number;
  total_current: number;
};

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const conditions: string[] = ["deleted_at IS NULL"];
    const params: unknown[] = [];

    const q = sp.get("q")?.trim();
    if (q) {
      conditions.push(
        "(code LIKE ? OR name LIKE ? OR brand LIKE ? OR model LIKE ? OR location LIKE ?)",
      );
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }

    const location = sp.get("location")?.trim();
    if (location) {
      conditions.push("location = ?");
      params.push(location);
    }

    if (sp.get("lowStock") === "1") {
      conditions.push("stock_current <= 0");
    }

    const where = conditions.join(" AND ");
    const rows = await query<SparepartItem[]>(
      `SELECT id, code, name, brand, model, location,
              stock_in, stock_out, stock_current,
              image_url, notes, deleted_at, created_at, updated_at
       FROM sparepart_items
       WHERE ${where}
       ORDER BY code ASC`,
      params,
    );

    const [summary] = await query<SummaryRow[]>(
      `SELECT
         COUNT(*) AS total_items,
         SUM(CASE WHEN stock_current <= 0 THEN 1 ELSE 0 END) AS zero_stock,
         COALESCE(SUM(stock_current), 0) AS total_current
       FROM sparepart_items
       WHERE deleted_at IS NULL`,
    );

    const locations = await query<LocationRow[]>(
      `SELECT DISTINCT location
       FROM sparepart_items
       WHERE deleted_at IS NULL AND location IS NOT NULL AND location != ''
       ORDER BY location ASC`,
    );

    return NextResponse.json({
      rows,
      summary: {
        totalItems: Number(summary?.total_items ?? 0),
        zeroStock: Number(summary?.zero_stock ?? 0),
        totalCurrent: Number(summary?.total_current ?? 0),
      },
      locations: locations.map((r) => r.location),
    });
  } catch (error) {
    console.error("GET /sparepart/stock failed", error);
    return NextResponse.json(
      { error: "Failed to load stock overview." },
      { status: 500 },
    );
  }
}
