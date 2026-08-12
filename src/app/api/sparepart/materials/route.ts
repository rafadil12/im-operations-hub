import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { execute, query } from "@/lib/db";
import { parseSparepartItemBody } from "@/lib/sparepartValidation";
import type { SparepartItem, SparepartItemInput } from "@/lib/types";

const LIST_SQL = `
  SELECT i.id, i.code, i.name_en, i.name_cn, i.brand_en, i.brand_cn, i.model,
         i.stock_current,
         i.image_url, i.notes, i.deleted_at, i.created_at, i.updated_at
  FROM sparepart_items i
  WHERE i.deleted_at IS NULL
`;

const SEARCH_SQL = `
  (i.code LIKE ? OR i.name_en LIKE ? OR i.name_cn LIKE ?
   OR i.brand_en LIKE ? OR i.brand_cn LIKE ? OR i.model LIKE ?)
`;

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartMaterialsRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const sp = request.nextUrl.searchParams;
    const conditions: string[] = [];
    const params: unknown[] = [];

    const q = sp.get("q")?.trim();
    if (q) {
      conditions.push(SEARCH_SQL);
      const like = `%${q}%`;
      params.push(like, like, like, like, like, like);
    }

    const sql =
      LIST_SQL +
      (conditions.length ? ` AND ${conditions.join(" AND ")}` : "") +
      " ORDER BY i.code ASC";

    const rows = await query<SparepartItem[]>(sql, params);
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/materials failed", error);
    return NextResponse.json(
      { error: "Failed to load materials." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartMaterialsCreate);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = (await request.json()) as Partial<SparepartItemInput>;
    const parsed = parseSparepartItemBody(body);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Validation failed.", errors: parsed.errors },
        { status: 400 },
      );
    }

    const data = parsed.data;
    try {
      const result = await execute(
        `INSERT INTO sparepart_items
          (code, name_en, name_cn, brand_en, brand_cn, model, notes, stock_current)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          data.code,
          data.name_en || null,
          data.name_cn || null,
          data.brand_en || null,
          data.brand_cn || null,
          data.model || null,
          data.notes || null,
        ],
      );
      return NextResponse.json({ id: result.insertId }, { status: 201 });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "ER_DUP_ENTRY") {
        return NextResponse.json(
          { error: `Material code "${data.code}" already exists.` },
          { status: 409 },
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("POST /sparepart/materials failed", error);
    return NextResponse.json(
      { error: "Failed to create material." },
      { status: 500 },
    );
  }
}
