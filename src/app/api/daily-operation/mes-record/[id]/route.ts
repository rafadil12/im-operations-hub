import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import type { MesData, MesDataInput } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

function parseBody(body: Partial<MesDataInput>): MesDataInput | null {
  const description_cn = body.description_cn?.toString().trim() || "";
  const user_id = body.user_id ? Number(body.user_id) : NaN;
  const division_id = body.division_id ? Number(body.division_id) : NaN;
  const category_id = body.category_id ? Number(body.category_id) : NaN;
  const subcategory_id = body.subcategory_id
    ? Number(body.subcategory_id)
    : NaN;
  const type_id = body.type_id ? Number(body.type_id) : NaN;
  const status_id = body.status_id ? Number(body.status_id) : NaN;
  const start_time = body.start_time?.toString() || "";

  if (
    !description_cn ||
    !Number.isFinite(user_id) ||
    !Number.isFinite(division_id) ||
    !Number.isFinite(category_id) ||
    !Number.isFinite(subcategory_id) ||
    !Number.isFinite(type_id) ||
    !Number.isFinite(status_id) ||
    !start_time
  ) {
    return null;
  }

  return {
    user_id,
    division_id,
    category_id,
    subcategory_id,
    description_cn,
    description_en: body.description_en?.toString().trim() || null,
    solution_cn: body.solution_cn?.toString().trim() || null,
    solution_en: body.solution_en?.toString().trim() || null,
    type_id,
    status_id,
    start_time,
    end_time: body.end_time?.toString() || null,
  };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const rows = await query<MesData[]>(
      "SELECT * FROM mes_record WHERE id = ? AND deleted_at IS NULL",
      [Number(id)],
    );
    if (!rows.length) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ row: rows[0] });
  } catch (error) {
    console.error("GET /mes-record/[id] failed", error);
    return NextResponse.json({ error: "Failed to load record." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as Partial<MesDataInput>;
    const data = parseBody(body);

    if (!data) {
      return NextResponse.json(
        {
          error:
            "User, Division, Category, Subcategory, Type, Status, Description (CN) and Start Time are required.",
        },
        { status: 400 },
      );
    }

    const result = await execute(
      `UPDATE mes_record SET
        user_id = ?, division_id = ?, category_id = ?, subcategory_id = ?,
        description_cn = ?, description_en = ?, solution_cn = ?, solution_en = ?,
        type_id = ?, status_id = ?, start_time = ?, end_time = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        data.user_id,
        data.division_id,
        data.category_id,
        data.subcategory_id,
        data.description_cn,
        data.description_en,
        data.solution_cn,
        data.solution_en,
        data.type_id,
        data.status_id,
        data.start_time,
        data.end_time,
        Number(id),
      ],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /mes-record/[id] failed", error);
    return NextResponse.json({ error: "Failed to update record." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const result = await execute(
      "UPDATE mes_record SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
      [Number(id)],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /mes-record/[id] failed", error);
    return NextResponse.json({ error: "Failed to delete record." }, { status: 500 });
  }
}
