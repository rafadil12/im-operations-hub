import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type ShiftCode = "D/S" | "N/S";

type ShiftScheduleChangeRow = {
  id: number;
  employee_no: string;
  change_date: string;
  from_shift: ShiftCode;
  to_shift: ShiftCode;
  off_date: string | null;
  rotation_rule_id: number | null;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export async function GET(request: NextRequest) {
  const gate = await requirePermission(
    PERMISSIONS.organizationShiftManage,
  );

  if (gate instanceof NextResponse) {
    return gate;
  }

  try {
    const searchParams = request.nextUrl.searchParams;

    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    const employeeNo =
      searchParams.get("employeeNo")?.trim() || null;

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        {
          success: false,
          error: "year must be a valid year.",
        },
        { status: 400 },
      );
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json(
        {
          success: false,
          error: "month must be between 1 and 12.",
        },
        { status: 400 },
      );
    }

    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;

    const monthStart = `${year}-${pad(month)}-01`;
    const nextMonthStart =
      `${nextYear}-${pad(nextMonth)}-01`;

    let sql = `
      SELECT
        id,
        employee_no,
        change_date,
        from_shift,
        to_shift,
        off_date,
        rotation_rule_id
      FROM shift_schedule_changes
      WHERE
        (
          change_date >= ?
          AND change_date < ?
        )
        OR
        (
          off_date >= ?
          AND off_date < ?
        )
      ORDER BY change_date ASC, id ASC
    `;

    let params: string[] = [
      monthStart,
      nextMonthStart,
      monthStart,
      nextMonthStart,
    ];

    if (employeeNo) {
      sql = `
        SELECT
          id,
          employee_no,
          change_date,
          from_shift,
          to_shift,
          off_date,
          rotation_rule_id
        FROM shift_schedule_changes
        WHERE
          employee_no = ?
          AND (
            (
              change_date >= ?
              AND change_date < ?
            )
            OR
            (
              off_date >= ?
              AND off_date < ?
            )
          )
        ORDER BY change_date ASC, id ASC
      `;

      params = [
        employeeNo,
        monthStart,
        nextMonthStart,
        monthStart,
        nextMonthStart,
      ];
    }

    const rows =
      await query<ShiftScheduleChangeRow[]>(
        sql,
        params,
      );

    return NextResponse.json({
      success: true,
      year,
      month,
      data: rows,
    });
  } catch (error) {
    console.error(
      "GET /api/organization/shift-management/changes failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load shift schedule changes.",
      },
      { status: 500 },
    );
  }
}