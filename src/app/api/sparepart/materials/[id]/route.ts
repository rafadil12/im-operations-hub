import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { parseSparepartItemBody } from "@/lib/sparepartValidation";
import type { SparepartItemInput } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

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
         SET code = ?, name = ?, brand = ?, model = ?, location = ?, notes = ?
         WHERE id = ? AND deleted_at IS NULL`,
        [
          data.code,
          data.name,
          data.brand || null,
          data.model || null,
          data.location || null,
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
