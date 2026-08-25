import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { PERMISSIONS, PROTECTED_ACCOUNT_EMPLOYEE_NO, requireAnyPermission } from "@/lib/auth";
import { jsonError } from "@/lib/safety/apiHelpers";

type UserRow = {
  id: number;
  employee_no: string | null;
  name_cn: string | null;
  name_en: string | null;
  division_id: number | null;
};

export async function GET() {
  const gate = await requireAnyPermission([
    PERMISSIONS.safetyOverviewView,
    PERMISSIONS.safetySubmissionRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const users = await query<UserRow[]>(
      `
        SELECT
          u.id,
          u.employee_no,
          u.name_cn,
          u.name_en,
          u.division_id
        FROM system_users su
        INNER JOIN users u ON u.id = su.user_id
        WHERE su.is_active = 1
          AND UPPER(COALESCE(u.employee_no, '')) <> ?
        ORDER BY u.employee_no ASC
      `,
      [PROTECTED_ACCOUNT_EMPLOYEE_NO]
    );

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("GET /api/safety/users failed:", error);
    return jsonError("Failed to load users.", 500);
  }
}
