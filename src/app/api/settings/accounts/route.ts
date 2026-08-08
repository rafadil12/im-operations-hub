import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.adminAccountsManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const rows = await query<RowDataPacket[]>(
      `SELECT
         su.id,
         su.user_id,
         su.is_active,
         su.role_id,
         su.last_login_at,
         u.employee_no,
         u.name_en,
         u.name_cn,
         r.name AS role_name
       FROM system_users su
       INNER JOIN users u ON u.id = su.user_id
       LEFT JOIN roles r ON r.id = su.role_id
       ORDER BY u.employee_no`,
    );

    return NextResponse.json({
      rows: rows.map((r) => ({
        id: Number(r.id),
        userId: Number(r.user_id),
        employeeNo: (r.employee_no as string | null) ?? null,
        nameEn: (r.name_en as string | null) ?? null,
        nameCn: (r.name_cn as string | null) ?? null,
        isActive: Boolean(r.is_active),
        roleId: r.role_id != null ? Number(r.role_id) : null,
        roleName: (r.role_name as string | null) ?? null,
        lastLoginAt: (r.last_login_at as string | null) ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/settings/accounts failed", error);
    return NextResponse.json(
      { error: "Failed to load accounts." },
      { status: 500 },
    );
  }
}
