import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { PERMISSIONS, PROTECTED_ACCOUNT_EMPLOYEE_NO, requirePermission } from "@/lib/auth";
import { execute, query } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };
type CountRow = { c: number };

export async function PUT(request: NextRequest, ctx: Ctx) {
  const gate = await requirePermission(PERMISSIONS.dailyMasterManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await ctx.params;
    const userId = Number(id);
    const body = await request.json();
    const divisionId =
      body.division_id === null || body.division_id === "" || body.division_id === undefined
        ? null
        : Number(body.division_id);

    if (!userId) {
      return NextResponse.json({ error: "Invalid PIC id." }, { status: 400 });
    }
    if (divisionId === null || Number.isNaN(divisionId)) {
      return NextResponse.json({ error: "Division is required." }, { status: 400 });
    }

    const current = await query<RowDataPacket[]>(
      `SELECT su.is_daily_operation_pic, u.employee_no
       FROM users u
       INNER JOIN system_users su ON su.user_id = u.id
       WHERE u.id = ?
       LIMIT 1`,
      [userId]
    );
    if (!current[0] || Number(current[0].is_daily_operation_pic) !== 1) {
      return NextResponse.json({ error: "PIC not found." }, { status: 404 });
    }
    if (String(current[0].employee_no ?? "").toUpperCase() === PROTECTED_ACCOUNT_EMPLOYEE_NO) {
      return NextResponse.json(
        { error: "The Super Admin account cannot be a PIC." },
        { status: 400 }
      );
    }

    const divisions = await query<RowDataPacket[]>(
      "SELECT id FROM divisions WHERE id = ? LIMIT 1",
      [divisionId]
    );
    if (!divisions[0]) {
      return NextResponse.json({ error: "Division not found." }, { status: 404 });
    }

    const result = await execute("UPDATE users SET division_id = ? WHERE id = ?", [
      divisionId,
      userId,
    ]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /users/[id] failed", error);
    return NextResponse.json({ error: "Failed to update PIC." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const gate = await requirePermission(PERMISSIONS.dailyMasterManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await ctx.params;
    const userId = Number(id);
    if (!userId) {
      return NextResponse.json({ error: "Invalid PIC id." }, { status: 400 });
    }

    const used = await query<CountRow[]>(
      "SELECT COUNT(*) AS c FROM mes_record WHERE user_id = ? AND deleted_at IS NULL",
      [userId]
    );
    if (Number(used[0]?.c ?? 0) > 0) {
      return NextResponse.json(
        { error: "Cannot unassign: PIC is still referenced by records." },
        { status: 409 }
      );
    }

    const result = await execute(
      "UPDATE system_users SET is_daily_operation_pic = 0 WHERE user_id = ?",
      [userId]
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /users/[id] failed", error);
    return NextResponse.json({ error: "Failed to unassign PIC." }, { status: 500 });
  }
}
