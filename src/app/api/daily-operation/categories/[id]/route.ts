import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };
type CountRow = { c: number };

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const name_en = body.name_en?.toString().trim() || null;
    const name_cn = body.name_cn?.toString().trim() || null;
    const division_id = body.division_id ? Number(body.division_id) : null;

    if (!name_en && !name_cn) {
      return NextResponse.json(
        { error: "Name (EN or CN) is required." },
        { status: 400 },
      );
    }

    const result = await execute(
      "UPDATE categories SET name_cn = ?, name_en = ?, division_id = ? WHERE id = ?",
      [name_cn, name_en, division_id, Number(id)],
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /categories/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update category." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const numId = Number(id);

    const [subUsed, dataUsed] = await Promise.all([
      query<CountRow[]>(
        "SELECT COUNT(*) AS c FROM subcategories WHERE category_id = ?",
        [numId],
      ),
      query<CountRow[]>(
        "SELECT COUNT(*) AS c FROM mes_record WHERE category_id = ? AND deleted_at IS NULL",
        [numId],
      ),
    ]);

    if (Number(subUsed[0]?.c ?? 0) > 0 || Number(dataUsed[0]?.c ?? 0) > 0) {
      return NextResponse.json(
        { error: "Cannot delete: category is still referenced." },
        { status: 409 },
      );
    }

    const result = await execute("DELETE FROM categories WHERE id = ?", [numId]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /categories/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete category." },
      { status: 500 },
    );
  }
}
