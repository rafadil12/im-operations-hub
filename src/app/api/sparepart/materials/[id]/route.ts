import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { parseSparepartItemBody } from "@/lib/sparepartValidation";
import type { SparepartItem, SparepartItemInput } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;
    const itemId = Number(id);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "Invalid material id." }, { status: 400 });
    }
    const rows = await query<SparepartItem[]>(
      `SELECT id, code, name, brand, model, location, default_storage_location_id,
              stock_in, stock_out, stock_current,
              image_url, notes, deleted_at, created_at, updated_at
       FROM sparepart_items
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [itemId],
    );
    if (!rows[0]) {
      return NextResponse.json({ error: "Material not found." }, { status: 404 });
    }

    const balances = await query(
      `SELECT b.id, b.item_id, b.storage_location_id, b.qty, b.updated_at,
              loc.code AS location_code, loc.name AS location_name
       FROM sparepart_stock_balances b
       JOIN sparepart_storage_locations loc ON loc.id = b.storage_location_id
       WHERE b.item_id = ?
       ORDER BY loc.name ASC`,
      [itemId],
    );

    return NextResponse.json({ row: { ...rows[0], balances } });
  } catch (error) {
    console.error("GET /sparepart/materials/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to load material." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;
    const itemId = Number(id);
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
        `UPDATE sparepart_items
         SET code = ?, name = ?, brand = ?, model = ?, location = ?,
             default_storage_location_id = ?, notes = ?
         WHERE id = ? AND deleted_at IS NULL`,
        [
          data.code,
          data.name,
          data.brand || null,
          data.model || null,
          data.location || null,
          data.default_storage_location_id ?? null,
          data.notes || null,
          itemId,
        ],
      );
      if (result.affectedRows === 0) {
        return NextResponse.json(
          { error: "Material not found." },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true });
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
    console.error("PUT /sparepart/materials/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update material." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;
    const result = await execute(
      `UPDATE sparepart_items SET deleted_at = NOW()
       WHERE id = ? AND deleted_at IS NULL`,
      [Number(id)],
    );
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Material not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /sparepart/materials/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete material." },
      { status: 500 },
    );
  }
}
