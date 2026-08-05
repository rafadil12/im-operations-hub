import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { SparepartItem } from "@/lib/types";

const SELECT_COLS = `
  id, code, name, brand, model, location,
  stock_in, stock_out, stock_current,
  image_url, notes, deleted_at, created_at, updated_at
`;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Strip LIKE metacharacters so user input cannot broaden the pattern. */
function sanitizeLike(value: string): string {
  return value.replace(/[%_\\]/g, "");
}

export async function GET(request: NextRequest) {
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
         FROM sparepart_items
         WHERE deleted_at IS NULL AND code = ?
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

    // Rank: exact code → code prefix → description prefix → other field match
    const rows = await query<SparepartItem[]>(
      `SELECT ${SELECT_COLS}
       FROM sparepart_items
       WHERE deleted_at IS NULL
         AND (
           code LIKE ?
           OR name LIKE ?
           OR brand LIKE ?
           OR model LIKE ?
         )
       ORDER BY
         CASE
           WHEN code = ? THEN 0
           WHEN code LIKE ? THEN 1
           WHEN name LIKE ? THEN 2
           ELSE 3
         END,
         code ASC
       LIMIT ?`,
      [like, like, like, like, needle, prefix, prefix, limit],
    );

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/materials/suggest failed", error);
    return NextResponse.json(
      { error: "Failed to search materials." },
      { status: 500 },
    );
  }
}
