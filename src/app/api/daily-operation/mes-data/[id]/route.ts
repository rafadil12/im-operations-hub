import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import type { MesData, MesDataInput } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

function parseBody(body: Partial<MesDataInput>): MesDataInput {
  return {
    user_id: body.user_id ? Number(body.user_id) : null,
    division_id: body.division_id ? Number(body.division_id) : null,
    category_id: body.category_id ? Number(body.category_id) : null,
    subcategory_id: body.subcategory_id ? Number(body.subcategory_id) : null,
    description: body.description?.toString().trim() || null,
    solution: body.solution?.toString().trim() || null,
    type: body.type?.toString() || null,
    status: body.status?.toString() || null,
    start_time: body.start_time?.toString() || null,
    end_time: body.end_time?.toString() || null,
  };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const rows = await query<MesData[]>(
      "SELECT * FROM mes_data WHERE id = ? AND deleted_at IS NULL",
      [Number(id)],
    );
    if (!rows.length) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ row: rows[0] });
  } catch (error) {
    console.error("GET /mes-data/[id] failed", error);
    return NextResponse.json({ error: "Failed to load record." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as Partial<MesDataInput>;
    const data = parseBody(body);

    if (!data.division_id || !data.status || !data.start_time) {
      return NextResponse.json(
        { error: "Division, Status and Start Time are required." },
        { status: 400 },
      );
    }

    const result = await execute(
      `UPDATE mes_data SET
        user_id = ?, division_id = ?, category_id = ?, subcategory_id = ?,
        description = ?, solution = ?, type = ?, status = ?,
        start_time = ?, end_time = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        data.user_id,
        data.division_id,
        data.category_id,
        data.subcategory_id,
        data.description,
        data.solution,
        data.type,
        data.status,
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
    console.error("PUT /mes-data/[id] failed", error);
    return NextResponse.json({ error: "Failed to update record." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const result = await execute(
      "UPDATE mes_data SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
      [Number(id)],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /mes-data/[id] failed", error);
    return NextResponse.json({ error: "Failed to delete record." }, { status: 500 });
  }
}
