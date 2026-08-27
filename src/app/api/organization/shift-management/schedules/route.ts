import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type GeneratedScheduleRow = {
  id: number;
  employee_no: string;
  schedule_date: string;
  shift_code: "D/S" | "N/S" | null;
  schedule_type: "D" | "N" | "OFF";
  rotation_rule_id: number | null;
  generated_at: string;
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

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "year and month are required",
        },
        { status: 400 },
      );
    }

    const startDate = `${year}-${pad(month)}-01`;

    const rows = await query<GeneratedScheduleRow[]>(
      `
        SELECT
          id,
          employee_no,
          schedule_date,
          shift_code,
          schedule_type,
          rotation_rule_id,
          generated_at,
          updated_at
        FROM shift_schedules
        WHERE schedule_date >= ?
          AND schedule_date < DATE_ADD(?, INTERVAL 1 MONTH)
        ORDER BY
          employee_no ASC,
          schedule_date ASC,
          id ASC
      `,
      [startDate, startDate],
    );

    console.log(
      `[Schedules] DB=${process.env.DB_NAME} YEAR=${year} MONTH=${month} ROWS=${rows.length}`,
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
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load generated schedules:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load generated schedules.",
      },
      { status: 500 },
    );
  }
}