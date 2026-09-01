import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { execute, query } from "@/lib/db";
import { ITEM_CATEGORY_FROM, ITEM_CATEGORY_SELECT } from "@/lib/sparepart/categories";
import { parseSparepartItemBody } from "@/lib/sparepart/validation";
import type { SparepartItem, SparepartItemInput } from "@/lib/types";

const SEARCH_SQL = `
  (i.code LIKE ? OR i.name_en LIKE ? OR i.name_cn LIKE ?
   OR i.brand_en LIKE ? OR i.brand_cn LIKE ? OR i.model LIKE ?)
`;

async function categoryExists(id: number): Promise<boolean> {
  const rows = await query<{ id: number }[]>(
    `SELECT id FROM sparepart_categories WHERE id = ? AND is_active = 1 LIMIT 1`,
    [id]
  );
  return Boolean(rows[0]);
}

async function uomExists(id: number): Promise<boolean> {
  const rows = await query<{ id: number }[]>(
    `SELECT id FROM uoms WHERE id = ? AND is_active = 1 LIMIT 1`,
    [id]
  );
  return Boolean(rows[0]);
}

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartMaterialsRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const sp = request.nextUrl.searchParams;
    const conditions: string[] = ["i.deleted_at IS NULL"];
    const params: unknown[] = [];

    const q = sp.get("q")?.trim();
    if (q) {
      conditions.push(SEARCH_SQL);
      const like = `%${q}%`;
      params.push(like, like, like, like, like, like);
    }

    const category = sp.get("category")?.trim();
    if (category) {
      conditions.push("c.code = ?");
      params.push(category.toUpperCase());
    }

    const sql = `
      SELECT ${ITEM_CATEGORY_SELECT}
      FROM ${ITEM_CATEGORY_FROM}
      WHERE ${conditions.join(" AND ")}
      ORDER BY i.code ASC
    `;

    const rows = await query<SparepartItem[]>(sql, params);
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/materials failed", error);
    return NextResponse.json({ error: "Failed to load materials." }, { status: 500 });
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
        { status: 400 }
      );
    }

    const data = parsed.data;
    if (!(await categoryExists(data.category_id))) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }
    if (!(await uomExists(data.uom_id))) {
      return NextResponse.json({ error: "Invalid UoM." }, { status: 400 });
    }

    try {
      const result = await execute(
        `INSERT INTO sparepart_items
          (code, name_en, name_cn, brand_en, brand_cn, model, notes,
           stock_current, min_stock, is_active, category_id, uom_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        [
          data.code,
          data.name_en || null,
          data.name_cn || null,
          data.brand_en || null,
          data.brand_cn || null,
          data.model || null,
          data.notes || null,
          data.min_stock,
          data.is_active ? 1 : 0,
          data.category_id,
          data.uom_id,
        ]
      );
      return NextResponse.json({ id: result.insertId }, { status: 201 });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "ER_DUP_ENTRY") {
        return NextResponse.json(
          { error: `Material code "${data.code}" already exists.` },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("POST /sparepart/materials failed", error);
    return NextResponse.json({ error: "Failed to create material." }, { status: 500 });
  }
}
