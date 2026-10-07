import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { query } from "@/lib/db";

type Named = { id: number; code: string; name_en: string | null; name_cn: string | null };

export async function GET(request: NextRequest) {
  const gate = await requireAnyPermission([
    PERMISSIONS.dailyRecordCreate,
    PERMISSIONS.dailyRecordUpdate,
    PERMISSIONS.dailyRecordRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const sp = request.nextUrl.searchParams;
    const q = sp.get("q")?.trim() ?? "";
    const itemId = Number(sp.get("itemId") || 0);
    const locationId = Number(sp.get("locationId") || 0);
    const levelId = Number(sp.get("levelId") || 0);

    const locations = await query<Named[]>(
      `SELECT id, code, name_en, name_cn
       FROM sparepart_storage_locations
       WHERE is_active = 1
       ORDER BY code ASC`
    );
    const levels = await query<Named[]>(
      `SELECT id, code, name_en, name_cn
       FROM sparepart_stock_levels
       WHERE is_active = 1
       ORDER BY sort_order ASC, code ASC`
    );

    const like = `%${q.replace(/[%_\\]/g, "")}%`;
    const materials = await query<Named[]>(
      `SELECT id, code, name_en, name_cn
       FROM sparepart_items
       WHERE deleted_at IS NULL AND is_active = 1
         AND (? = '' OR code LIKE ? OR name_en LIKE ? OR name_cn LIKE ?)
       ORDER BY code ASC
       LIMIT 20`,
      [q, like, like, like]
    );

    let available: number | null = null;
    if (itemId > 0 && locationId > 0 && levelId > 0) {
      const rows = await query<{ qty: number }[]>(
        `SELECT qty FROM sparepart_stock_balances
         WHERE item_id = ? AND storage_location_id = ? AND level_id = ?
         LIMIT 1`,
        [itemId, locationId, levelId]
      );
      available = rows[0]?.qty ?? 0;
    }

    return NextResponse.json({ locations, levels, materials, available });
  } catch (error) {
    console.error("GET /sparepart-issue-options failed", error);
    return NextResponse.json({ error: "Failed to load material options." }, { status: 500 });
  }
}
