import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import {
  parseAndValidateMesBody,
  type MesValidationErrorKey,
} from "@/lib/daily-operation/mesRecordValidation";
import type { MesData, MesDataInput } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

const VALIDATION_MESSAGES: Record<MesValidationErrorKey, string> = {
  required:
    "User, Division, Category, Subcategory, Type, Status, Start Time, End Time, Description (CN/EN) and Solution (CN/EN) are required.",
  startBeforeEnd: "Start time must be before end time.",
  enHasChinese: "English fields must not contain Chinese characters.",
  cnNeedsChinese: "Chinese fields must include Chinese characters.",
  invalidDateTime: "Please enter a valid date and time.",
};

export async function GET(_req: NextRequest, ctx: Ctx) {
  const gate = await requirePermission(PERMISSIONS.dailyRecordRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await ctx.params;
    const rows = await query<MesData[]>(
      "SELECT * FROM mes_record WHERE id = ? AND deleted_at IS NULL",
      [Number(id)]
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
  const gate = await requirePermission(PERMISSIONS.dailyRecordUpdate);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as Partial<MesDataInput>;
    const parsed = parseAndValidateMesBody(body);

    if (!parsed.ok) {
      return NextResponse.json(
        {
          error: VALIDATION_MESSAGES[parsed.messageKey],
          errors: parsed.errors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

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
      ]
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
  const gate = await requirePermission(PERMISSIONS.dailyRecordDelete);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await ctx.params;
    const result = await execute(
      "UPDATE mes_record SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
      [Number(id)]
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
