import { NextResponse } from "next/server";

import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { computeOrganizationOverviewMetrics } from "@/lib/organization/overviewMetrics";
import type {
  OrganizationAttendanceRow,
  OrganizationEmployeeRow,
} from "@/lib/organization/types";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function monthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  return { start, end };
}

export async function GET() {
  const gate = await requireAnyPermission([
    PERMISSIONS.overviewView,
    PERMISSIONS.dailyMasterManage,
  ]);

  if (gate instanceof NextResponse) {
    return gate;
  }

  try {
    const { start, end } = monthRange();

    const [employeeRows, attendanceRows] = await Promise.all([
      query<OrganizationEmployeeRow[]>(
        `
        SELECT
          u.employee_no,
          u.name_en,
          u.name_cn,
          d.name_en AS division_name_en,
          eo.position_id,
          p.name_en AS position_name_en,
          eo.employment_status
        FROM users u
        LEFT JOIN employee_organization eo
          ON eo.user_id = u.id
        LEFT JOIN divisions d
          ON d.id = u.division_id
        LEFT JOIN positions p
          ON p.id = eo.position_id
        WHERE u.employee_no IS NOT NULL
          AND u.employee_no <> 'SUPERADMIN'
        ORDER BY COALESCE(u.name_en, u.name_cn, u.employee_no) ASC
        `
      ),
      query<OrganizationAttendanceRow[]>(
        `
        SELECT
          employee_no,
          attendance_date,
          attendance_value
        FROM attendance_daily
        WHERE attendance_date >= ?
          AND attendance_date <= ?
        `,
        [start, end]
      ),
    ]);

    const metrics = computeOrganizationOverviewMetrics({
      employees: employeeRows,
      attendanceRows,
    });

    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error("GET /api/organization/overview failed", error);
    return jsonError("Failed to load organization overview.", 500);
  }
}
