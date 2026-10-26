import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import {
  hasDetail,
  identityChange,
  linkChange,
  loadDivision,
  nameChanges,
} from "@/lib/logs-center/dailyRemark";
import { recordLogsCenter, suppressLogsCenter } from "@/lib/logs-center/record";

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
    const division_id = body.division_id ? Number(body.division_id) : null;

    if (!name_en && !name_cn) {
      return NextResponse.json({ error: "Name (EN or CN) is required." }, { status: 400 });
    }

    const categoryId = Number(id);
    const existing = await query<
      { name_en: string | null; name_cn: string | null; division_id: number | null }[]
    >(
      "SELECT name_en, name_cn, division_id FROM daily_operation_categories WHERE id = ? LIMIT 1",
      [categoryId]
    );
    if (!existing[0]) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const beforeDivisionId =
      existing[0].division_id == null ? null : Number(existing[0].division_id);
    const [beforeDivision, division] = await Promise.all([
      loadDivision(beforeDivisionId),
      loadDivision(division_id),
    ]);
    if (division_id && !division) {
      return NextResponse.json({ error: "Division not found." }, { status: 404 });
    }

    const changes = nameChanges(existing[0], { name_en, name_cn });
    const divisionChange = linkChange("division", beforeDivision, division);
    if (divisionChange) changes.push(divisionChange);
    if (!hasDetail(changes)) {
      return NextResponse.json({ ok: true });
    }

    const result = await suppressLogsCenter(() =>
      execute(
        "UPDATE daily_operation_categories SET name_cn = ?, name_en = ?, division_id = ? WHERE id = ?",
        [name_cn, name_en, division_id, categoryId]
      )
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    await recordLogsCenter({
      module: "daily-operation",
      action: "update",
      objectType: "category",
      changes,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /categories/[id] failed", error);
    return NextResponse.json({ error: "Failed to update category." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const gate = await requirePermission(PERMISSIONS.dailyMasterManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await ctx.params;
    const numId = Number(id);
    const existing = await query<{ name_en: string | null; name_cn: string | null }[]>(
      "SELECT name_en, name_cn FROM daily_operation_categories WHERE id = ? LIMIT 1",
      [numId]
    );
    if (!existing[0]) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const [subUsed, dataUsed] = await Promise.all([
      query<CountRow[]>("SELECT COUNT(*) AS c FROM daily_operation_subcategories WHERE category_id = ?", [numId]),
      query<CountRow[]>(
        "SELECT COUNT(*) AS c FROM daily_operation_record WHERE category_id = ? AND deleted_at IS NULL",
        [numId]
      ),
    ]);

    if (Number(subUsed[0]?.c ?? 0) > 0 || Number(dataUsed[0]?.c ?? 0) > 0) {
      return NextResponse.json(
        { error: "Cannot delete: category is still referenced." },
        { status: 409 }
      );
    }

    const result = await suppressLogsCenter(() =>
      execute("DELETE FROM daily_operation_categories WHERE id = ?", [numId])
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    await recordLogsCenter({
      module: "daily-operation",
      action: "delete",
      objectType: "category",
      changes: [identityChange(existing[0])],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /categories/[id] failed", error);
    return NextResponse.json({ error: "Failed to delete category." }, { status: 500 });
  }
}
