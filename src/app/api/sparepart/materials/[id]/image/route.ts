import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { execute, query } from "@/lib/db";
import {
  SparepartImageError,
  deleteMaterialImages,
  saveMaterialImage,
} from "@/lib/sparepart/images";
import type { SparepartItem } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

async function loadItem(itemId: number): Promise<SparepartItem | null> {
  const rows = await query<SparepartItem[]>(
    `SELECT i.id, i.code, i.name_en, i.name_cn, i.brand_en, i.brand_cn, i.model,
            i.stock_current, i.image_url, i.notes,
            i.deleted_at, i.created_at, i.updated_at
     FROM sparepart_items i
     WHERE i.id = ? AND i.deleted_at IS NULL
     LIMIT 1`,
    [itemId]
  );
  return rows[0] ?? null;
}

export async function POST(request: NextRequest, context: Ctx) {
  const gate = await requireAnyPermission([
    PERMISSIONS.sparepartMaterialsCreate,
    PERMISSIONS.sparepartMaterialsUpdate,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await context.params;
    const itemId = Number(id);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "Invalid material id." }, { status: 400 });
    }

    const item = await loadItem(itemId);
    if (!item) {
      return NextResponse.json({ error: "Material not found." }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const { imageUrl } = await saveMaterialImage(item.code, file);
    await execute(`UPDATE sparepart_items SET image_url = ? WHERE id = ? AND deleted_at IS NULL`, [
      imageUrl,
      itemId,
    ]);

    return NextResponse.json({ ok: true, image_url: imageUrl });
  } catch (error) {
    if (error instanceof SparepartImageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /sparepart/materials/[id]/image failed", error);
    return NextResponse.json({ error: "Failed to upload image." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const gate = await requirePermission(PERMISSIONS.sparepartMaterialsUpdate);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await context.params;
    const itemId = Number(id);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "Invalid material id." }, { status: 400 });
    }

    const item = await loadItem(itemId);
    if (!item) {
      return NextResponse.json({ error: "Material not found." }, { status: 404 });
    }

    await deleteMaterialImages(item.code);
    await execute(
      `UPDATE sparepart_items SET image_url = NULL WHERE id = ? AND deleted_at IS NULL`,
      [itemId]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SparepartImageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /sparepart/materials/[id]/image failed", error);
    return NextResponse.json({ error: "Failed to remove image." }, { status: 500 });
  }
}
