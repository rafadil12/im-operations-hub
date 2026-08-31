import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type AttendanceDailyRow = {
  id: number;
  employee_no: string;
  attendance_date: string;
  attendance_value: "10.5" | "8" | "4" | "OFF" | "AL" | "MC" | "UPL" | "A";
  planned_hours: number;
  source: "SHIFT" | "LEAVE";
  leave_request_id: number | null;
  created_at: string;
  updated_at: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    const employeeNo =
      searchParams.get("employeeNo")?.trim() || null;

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "year is required and must be valid.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "month is required and must be between 1 and 12.",
        },
        { status: 400 },
      );
    }

    const startDate = `${year}-${pad(month)}-01`;

    const params: Array<string> = [startDate, startDate];

    let employeeCondition = "";

    if (employeeNo) {
      employeeCondition = "AND employee_no = ?";
      params.push(employeeNo);
    }

    const rows = await query<AttendanceDailyRow[]>(
      `
        SELECT
          id,
          employee_no,
          attendance_date,
          attendance_value,
          planned_hours,
          source,
          leave_request_id,
          created_at,
          updated_at
        FROM attendance_daily
        WHERE attendance_date >= ?
          AND attendance_date < DATE_ADD(
            ?,
            INTERVAL 1 MONTH
          )
          ${employeeCondition}
        ORDER BY
          employee_no ASC,
          attendance_date ASC,
          id ASC
      `,
      params,
    );

    return NextResponse.json(
      {
        success: true,
        year,
        month,
        data: rows,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/organization/attendance/daily failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load daily attendance.",
      },
      { status: 500 },
    );
  }
}