import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import type { SparepartStorageLocation } from "@/lib/types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const SELECT_COLS = `id, code, name, is_active, created_at, updated_at`;

/** Strip LIKE metacharacters so user input cannot broaden the pattern. */
function sanitizeLike(value: string): string {
  return value.replace(/[%_\\]/g, "");
}

export async function GET(request: NextRequest) {
  const gate = await requireAnyPermission([
    PERMISSIONS.sparepartLocationsManage,
    PERMISSIONS.sparepartDocumentPost,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const sp = request.nextUrl.searchParams;
    const id = Number(sp.get("id") || 0);
    const exactCode = sp.get("exactCode")?.trim();
    const q = sp.get("q")?.trim() ?? "";
    const excludeId = Number(sp.get("excludeId") || 0);
    const rawLimit = Number(sp.get("limit") || DEFAULT_LIMIT);
    const limit = Math.min(
      Math.max(Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    if (Number.isInteger(id) && id > 0) {
      const rows = await query<SparepartStorageLocation[]>(
        `SELECT ${SELECT_COLS}
         FROM sparepart_storage_locations
         WHERE id = ?
         LIMIT 1`,
        [id],
      );
      return NextResponse.json({ rows });
    }

    if (exactCode) {
      const rows = await query<SparepartStorageLocation[]>(
        `SELECT ${SELECT_COLS}
         FROM sparepart_storage_locations
         WHERE is_active = 1 AND (code = ? OR name = ?)
         LIMIT 5`,
        [exactCode, exactCode],
      );
      return NextResponse.json({ rows });
    }

    const needle = sanitizeLike(q);
    if (needle.length < 1) {
      return NextResponse.json({ rows: [] });
    }

    const like = `%${needle}%`;
    const prefix = `${needle}%`;
    const excludeClause =
      Number.isInteger(excludeId) && excludeId > 0 ? "AND id <> ?" : "";
    const params: Array<string | number> = [
      like,
      like,
      needle,
      prefix,
      prefix,
    ];
    if (excludeClause) params.push(excludeId);
    params.push(limit);

    const rows = await query<SparepartStorageLocation[]>(
      `SELECT ${SELECT_COLS}
       FROM sparepart_storage_locations
       WHERE is_active = 1
         AND (code LIKE ? OR name LIKE ?)
         ${excludeClause}
       ORDER BY
         CASE
           WHEN code = ? THEN 0
           WHEN code LIKE ? THEN 1
           WHEN name LIKE ? THEN 2
           ELSE 3
         END,
         name ASC
       LIMIT ?`,
      params,
    );

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/storage-locations/suggest failed", error);
    return NextResponse.json(
      { error: "Failed to suggest storage locations." },
      { status: 500 },
    );
  }
}
