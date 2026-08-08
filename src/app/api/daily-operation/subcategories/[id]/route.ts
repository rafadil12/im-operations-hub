import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { execute, query } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };
type CountRow = { c: number };

export async function PUT(request: NextRequest, ctx: Ctx) {
  const gate = await requirePermission(PERMISSIONS.dailyMasterManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const name_en = body.name_en?.toString().trim() || null;
    const name_cn = body.name_cn?.toString().trim() || null;
    const category_id = body.category_id ? Number(body.category_id) : null;

    if (!name_en && !name_cn) {
      return NextResponse.json(
        { error: "Name (EN or CN) is required." },
        { status: 400 },
      );
    }
    if (!category_id) {
      return NextResponse.json(
        { error: "Category is required." },
        { status: 400 },
      );
    }

    const result = await execute(
      "UPDATE subcategories SET category_id = ?, name_cn = ?, name_en = ? WHERE id = ?",
      [category_id, name_cn, name_en, Number(id)],
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /subcategories/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update subcategory." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const gate = await requirePermission(PERMISSIONS.dailyMasterManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await ctx.params;
    const numId = Number(id);

    const used = await query<CountRow[]>(
      "SELECT COUNT(*) AS c FROM mes_record WHERE subcategory_id = ? AND deleted_at IS NULL",
      [numId],
    );
    if (Number(used[0]?.c ?? 0) > 0) {
      return NextResponse.json(
        { error: "Cannot delete: subcategory is still referenced by records." },
        { status: 409 },
      );
    }

    const result = await execute("DELETE FROM subcategories WHERE id = ?", [numId]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /subcategories/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete subcategory." },
      { status: 500 },
    );
  }
}
