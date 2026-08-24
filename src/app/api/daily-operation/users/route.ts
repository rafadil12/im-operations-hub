import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import {
  PERMISSIONS,
  PROTECTED_ACCOUNT_EMPLOYEE_NO,
  requirePermission,
} from "@/lib/auth";
import { execute, query } from "@/lib/db";

const PIC_SELECT = `
  u.id,
  su.id AS system_user_id,
  u.employee_no,
  u.name_en,
  u.name_cn,
  u.division_id
`;

function mapPicRow(r: RowDataPacket) {
  return {
    id: Number(r.id),
    systemUserId: Number(r.system_user_id),
    employeeNo: (r.employee_no as string | null) ?? null,
    nameEn: (r.name_en as string | null) ?? null,
    nameCn: (r.name_cn as string | null) ?? null,
    divisionId: r.division_id != null ? Number(r.division_id) : null,
  };
}

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.dailyMasterManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const [rows, candidates] = await Promise.all([
      query<RowDataPacket[]>(
        `SELECT ${PIC_SELECT}
         FROM system_users su
         INNER JOIN users u ON u.id = su.user_id
         WHERE su.is_daily_operation_pic = 1
           AND UPPER(COALESCE(u.employee_no, '')) <> ?
         ORDER BY u.employee_no`,
        [PROTECTED_ACCOUNT_EMPLOYEE_NO],
      ),
      query<RowDataPacket[]>(
        `SELECT ${PIC_SELECT}
         FROM system_users su
         INNER JOIN users u ON u.id = su.user_id
         WHERE su.is_active = 1
           AND su.is_daily_operation_pic = 0
           AND UPPER(COALESCE(u.employee_no, '')) <> ?
         ORDER BY u.employee_no`,
        [PROTECTED_ACCOUNT_EMPLOYEE_NO],
      ),
    ]);

    return NextResponse.json({
      rows: rows.map(mapPicRow),
      candidates: candidates.map(mapPicRow),
    });
  } catch (error) {
    console.error("GET /users failed", error);
    return NextResponse.json({ error: "Failed to load PIC." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.dailyMasterManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await request.json();
    const userId = Number(body.user_id);
    const divisionId =
      body.division_id === null ||
      body.division_id === "" ||
      body.division_id === undefined
        ? null
        : Number(body.division_id);

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ error: "Account is required." }, { status: 400 });
    }
    if (divisionId === null || Number.isNaN(divisionId)) {
      return NextResponse.json(
        { error: "Division is required." },
        { status: 400 },
      );
    }

    const account = await query<RowDataPacket[]>(
      `SELECT su.id, su.is_active, su.is_daily_operation_pic, u.employee_no
       FROM system_users su
       INNER JOIN users u ON u.id = su.user_id
       WHERE u.id = ?
       LIMIT 1`,
      [userId],
    );
    if (!account[0]) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 },
      );
    }
    if (
      String(account[0].employee_no ?? "").toUpperCase() ===
      PROTECTED_ACCOUNT_EMPLOYEE_NO
    ) {
      return NextResponse.json(
        { error: "The Super Admin account cannot be assigned as PIC." },
        { status: 400 },
      );
    }
    if (!account[0].is_active) {
      return NextResponse.json(
        { error: "Inactive accounts cannot be assigned as PIC." },
        { status: 400 },
      );
    }
    if (Number(account[0].is_daily_operation_pic) === 1) {
      return NextResponse.json(
        { error: "This account is already a PIC." },
        { status: 409 },
      );
    }

    const divisions = await query<RowDataPacket[]>(
      "SELECT id FROM divisions WHERE id = ? LIMIT 1",
      [divisionId],
    );
    if (!divisions[0]) {
      return NextResponse.json({ error: "Division not found." }, { status: 404 });
    }

    await execute("UPDATE users SET division_id = ? WHERE id = ?", [
      divisionId,
      userId,
    ]);
    await execute(
      "UPDATE system_users SET is_daily_operation_pic = 1 WHERE user_id = ?",
      [userId],
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("POST /users failed", error);
    return NextResponse.json(
      { error: "Failed to assign PIC." },
      { status: 500 },
    );
  }
}
