import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { execute, query } from "@/lib/db";
import { parseSparepartItemBody } from "@/lib/sparepartValidation";
import type { SparepartItem, SparepartItemInput } from "@/lib/types";

const LIST_SQL = `
  SELECT i.id, i.code, i.name, i.brand, i.model,
         i.stock_in, i.stock_out, i.stock_current,
         i.image_url, i.notes, i.deleted_at, i.created_at, i.updated_at
  FROM sparepart_items i
  WHERE i.deleted_at IS NULL
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
      conditions.push(
        "(i.code LIKE ? OR i.name LIKE ? OR i.brand LIKE ? OR i.model LIKE ?)",
      );
      const like = `%${q}%`;
      params.push(like, like, like, like);
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
          (code, name, brand, model, notes, stock_in, stock_out, stock_current)
         VALUES (?, ?, ?, ?, ?, 0, 0, 0)`,
        [
          data.code,
          data.name,
          data.brand || null,
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
