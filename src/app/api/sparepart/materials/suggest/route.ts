import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import { ITEM_CATEGORY_SELECT } from "@/lib/sparepartCategories";
import type { SparepartItem } from "@/lib/types";

const SELECT_COLS = ITEM_CATEGORY_SELECT;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Strip LIKE metacharacters so user input cannot broaden the pattern. */
function sanitizeLike(value: string): string {
  return value.replace(/[%_\\]/g, "");
}

export async function GET(request: NextRequest) {
  const gate = await requireAnyPermission([
    PERMISSIONS.sparepartMaterialsRead,
    PERMISSIONS.sparepartDocumentPost,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const sp = request.nextUrl.searchParams;
    const exactCode = sp.get("exactCode")?.trim();
    const q = sp.get("q")?.trim() ?? "";
    const rawLimit = Number(sp.get("limit") || DEFAULT_LIMIT);
    const limit = Math.min(
      Math.max(Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    if (exactCode) {
      const rows = await query<SparepartItem[]>(
        `SELECT ${SELECT_COLS}
         FROM sparepart_items i
         JOIN sparepart_categories c ON c.id = i.category_id
         WHERE i.deleted_at IS NULL AND i.code = ?
         LIMIT 5`,
        [exactCode],
      );
      return NextResponse.json({ rows });
    }

    const needle = sanitizeLike(q);
    if (needle.length < 1) {
      return NextResponse.json({ rows: [] });
    }

    const like = `%${needle}%`;
    const prefix = `${needle}%`;

    const rows = await query<SparepartItem[]>(
      `SELECT ${SELECT_COLS}
       FROM sparepart_items i
       JOIN sparepart_categories c ON c.id = i.category_id
       WHERE i.deleted_at IS NULL
         AND (
           i.code LIKE ?
           OR i.name_en LIKE ?
           OR i.name_cn LIKE ?
           OR i.brand_en LIKE ?
           OR i.brand_cn LIKE ?
           OR i.model LIKE ?
         )
       ORDER BY
         CASE
           WHEN i.code = ? THEN 0
           WHEN i.code LIKE ? THEN 1
           WHEN i.name_en LIKE ? OR i.name_cn LIKE ? THEN 2
           ELSE 3
         END,
         i.code ASC
       LIMIT ?`,
      [like, like, like, like, like, like, needle, prefix, prefix, prefix, limit],
    );

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/materials/suggest failed", error);
    return NextResponse.json(
      { error: "Failed to suggest materials." },
      { status: 500 },
    );
  }
}
