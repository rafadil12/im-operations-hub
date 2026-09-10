import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { execute, query } from "@/lib/db";
import { ITEM_CATEGORY_FROM, ITEM_CATEGORY_SELECT } from "@/lib/sparepart/categories";
import { parseSparepartItemBody } from "@/lib/sparepart/validation";
import { STOCK_BALANCE_FROM, STOCK_BALANCE_SELECT } from "@/lib/sparepart/stockBalances";
import type { SparepartItem, SparepartItemInput } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
  const gate = await requireAnyPermission([
    PERMISSIONS.sparepartMaterialsRead,
    PERMISSIONS.sparepartStockView,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await context.params;
    const itemId = Number(id);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "Invalid material id." }, { status: 400 });
    }
    const rows = await query<SparepartItem[]>(
      `SELECT ${ITEM_CATEGORY_SELECT}
       FROM ${ITEM_CATEGORY_FROM}
       WHERE i.id = ? AND i.deleted_at IS NULL
       LIMIT 1`,
      [itemId]
    );
    if (!rows[0]) {
      return NextResponse.json({ error: "Material not found." }, { status: 404 });
    }

    const balances = await query(
      `SELECT ${STOCK_BALANCE_SELECT}
       FROM ${STOCK_BALANCE_FROM}
       WHERE b.item_id = ? AND b.qty > 0
       ORDER BY loc.name_en ASC, lvl.sort_order ASC`,
      [itemId]
    );

    return NextResponse.json({ row: { ...rows[0], balances } });
  } catch (error) {
    console.error("GET /sparepart/materials/[id] failed", error);
    return NextResponse.json({ error: "Failed to load material." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: Ctx) {
  const gate = await requirePermission(PERMISSIONS.sparepartMaterialsUpdate);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await context.params;
    const itemId = Number(id);
    const body = (await request.json()) as Partial<SparepartItemInput>;
    const parsed = parseSparepartItemBody(body);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Validation failed.", errors: parsed.errors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const categoryRows = await query<{ id: number }[]>(
      `SELECT id FROM sparepart_categories WHERE id = ? AND is_active = 1 LIMIT 1`,
      [data.category_id]
    );
    if (!categoryRows[0]) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }
    const uomRows = await query<{ id: number }[]>(
      `SELECT id FROM uoms WHERE id = ? AND is_active = 1 LIMIT 1`,
      [data.uom_id]
    );
    if (!uomRows[0]) {
      return NextResponse.json({ error: "Invalid UoM." }, { status: 400 });
    }

    const existing = await query<
      Pick<SparepartItem, "id" | "code" | "image_url" | "stock_current">[]
    >(
      `SELECT id, code, image_url, stock_current FROM sparepart_items
       WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [itemId]
    );
    if (!existing[0]) {
      return NextResponse.json({ error: "Material not found." }, { status: 404 });
    }

    if (!data.is_active && Number(existing[0].stock_current) !== 0) {
      return NextResponse.json(
        { error: "Cannot set a material inactive while stock is not zero." },
        { status: 400 }
      );
    }

    const nextCode = existing[0].code;
    const nextImageUrl = existing[0].image_url;

    try {
      const result = await execute(
        `UPDATE sparepart_items
         SET code = ?, erp_item_code = ?, name_en = ?, name_cn = ?, brand_en = ?, brand_cn = ?,
             model = ?, notes = ?, image_url = ?, min_stock = ?, is_active = ?,
             category_id = ?, uom_id = ?
         WHERE id = ? AND deleted_at IS NULL`,
        [
          nextCode,
          data.erp_item_code || null,
          data.name_en || null,
          data.name_cn || null,
          data.brand_en || null,
          data.brand_cn || null,
          data.model || null,
          data.notes || null,
          nextImageUrl,
          data.min_stock,
          data.is_active ? 1 : 0,
          data.category_id,
          data.uom_id,
          itemId,
        ]
      );
      if (result.affectedRows === 0) {
        return NextResponse.json({ error: "Material not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "ER_DUP_ENTRY") {
        return NextResponse.json(
          { error: `Material code "${nextCode}" already exists.` },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("PUT /sparepart/materials/[id] failed", error);
    return NextResponse.json({ error: "Failed to update material." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const gate = await requirePermission(PERMISSIONS.sparepartMaterialsDelete);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await context.params;
    const itemId = Number(id);
    const existing = await query<{ stock_current: number }[]>(
      `SELECT stock_current FROM sparepart_items
       WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [itemId]
    );
    if (!existing[0]) {
      return NextResponse.json({ error: "Material not found." }, { status: 404 });
    }
    if (Number(existing[0].stock_current) !== 0) {
      return NextResponse.json(
        { error: "Cannot delete a material while stock is not zero." },
        { status: 400 }
      );
    }
    const result = await execute(
      `UPDATE sparepart_items SET deleted_at = NOW()
       WHERE id = ? AND deleted_at IS NULL`,
      [itemId]
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Material not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /sparepart/materials/[id] failed", error);
    return NextResponse.json({ error: "Failed to delete material." }, { status: 500 });
  }
}
