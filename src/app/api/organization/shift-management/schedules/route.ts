import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";

export const dynamic = "force-dynamic";

type ShiftCode = "D/S" | "N/S" | null;

type ScheduleType =
  | "D"
  | "N"
  | "1"
  | "4"
  | "OFF";

type ScheduleRow = {
  id: number;
  employee_no: string;
  schedule_date: string;
  shift_code: ShiftCode;
  schedule_type: ScheduleType;
  rotation_rule_id: number | null;
  generated_at: string;
  updated_at: string;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isManualScheduleType(
  value: unknown,
): value is "1" | "4" {
  return value === "1" || value === "4";
}

/* =========================================================
   GET
   =========================================================

   URL:
   /api/organization/shift-management/schedules
     ?year=2026
     &month=9
     &employeeNo=62000085

   ========================================================= */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    const employeeNo =
      searchParams.get("employeeNo")?.trim() || null;

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

    const startDate =
      `${year}-${pad(month)}-01`;

    const rows = await query<ScheduleRow[]>(
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
          AND schedule_date < DATE_ADD(
            ?,
            INTERVAL 1 MONTH
          )
          ${
            employeeNo
              ? "AND employee_no = ?"
              : ""
          }
        ORDER BY
          employee_no ASC,
          schedule_date ASC,
          id ASC
      `,
      employeeNo
        ? [
            startDate,
            startDate,
            employeeNo,
          ]
        : [
            startDate,
            startDate,
          ],
    );

    console.log(
      `[Schedules GET] YEAR=${year} MONTH=${month} EMPLOYEE=${employeeNo ?? "ALL"} ROWS=${rows.length}`,
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
      "GET /api/organization/shift-management/schedules failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load schedules.",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   POST
   =========================================================

   Manual Calendar Schedule

   1 = 08:00 - 17:00
   4 = 4 Hours

   Body:
   {
     "employeeNo": "62000085",
     "date": "2026-09-05",
     "scheduleType": "1"
   }

   ========================================================= */

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      employeeNo?: unknown;
      date?: unknown;
      scheduleType?: unknown;
    };

    const employeeNo =
      String(body.employeeNo ?? "").trim();

    const date =
      String(body.date ?? "").trim();

    const scheduleType =
      String(body.scheduleType ?? "").trim();

    /* -------------------------------------------------------
       VALIDATION
       ------------------------------------------------------- */

    if (!employeeNo) {
      return NextResponse.json(
        {
          success: false,
          error: "employeeNo is required.",
        },
        { status: 400 },
      );
    }

    if (!isValidDate(date)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "date must be in YYYY-MM-DD format.",
        },
        { status: 400 },
      );
    }

    if (!isManualScheduleType(scheduleType)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "scheduleType must be 1 or 4.",
        },
        { status: 400 },
      );
    }

    console.log(
      "[Schedules POST] request:",
      {
        employeeNo,
        date,
        scheduleType,
      },
    );

    /* -------------------------------------------------------
       FIND EXISTING ROW

       Database:
       UNIQUE(employee_no, schedule_date)

       Jadi kita tidak membuat row kedua.
       ------------------------------------------------------- */

    const existingRows = await query<{
      id: number;
      employee_no: string;
      schedule_date: string;
      schedule_type: ScheduleType;
      shift_code: ShiftCode;
      rotation_rule_id: number | null;
    }[]>(
      `
        SELECT
          id,
          employee_no,
          schedule_date,
          schedule_type,
          shift_code,
          rotation_rule_id
        FROM shift_schedules
        WHERE employee_no = ?
          AND schedule_date = ?
        LIMIT 1
      `,
      [
        employeeNo,
        date,
      ],
    );

    /* -------------------------------------------------------
       ROW SUDAH ADA
       ------------------------------------------------------- */

    if (existingRows.length > 0) {
      const existing = existingRows[0];

      console.log(
        "[Schedules POST] existing row:",
        existing,
      );

      await execute(
        `
          UPDATE shift_schedules
          SET
            shift_code = NULL,
            schedule_type = ?,
            rotation_rule_id = NULL
          WHERE id = ?
        `,
        [
          scheduleType,
          existing.id,
        ],
      );

      console.log(
        "[Schedules POST] row updated:",
        {
          id: existing.id,
          scheduleType,
        },
      );
    } else {
      /* -----------------------------------------------------
         ROW BELUM ADA
         ----------------------------------------------------- */

      await execute(
        `
          INSERT INTO shift_schedules (
            employee_no,
            schedule_date,
            shift_code,
            schedule_type,
            rotation_rule_id
          )
          VALUES (
            ?,
            ?,
            NULL,
            ?,
            NULL
          )
        `,
        [
          employeeNo,
          date,
          scheduleType,
        ],
      );

      console.log(
        "[Schedules POST] new row inserted:",
        {
          employeeNo,
          date,
          scheduleType,
        },
      );
    }

    /* -------------------------------------------------------
       READ BACK
       ------------------------------------------------------- */

    const savedRows = await query<ScheduleRow[]>(
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
        WHERE employee_no = ?
          AND schedule_date = ?
        LIMIT 1
      `,
      [
        employeeNo,
        date,
      ],
    );

    const saved = savedRows[0];

    if (!saved) {
      console.error(
        "[Schedules POST] row not found after save:",
        {
          employeeNo,
          date,
          scheduleType,
        },
      );

      return NextResponse.json(
        {
          success: false,
          error:
            `Schedule ${scheduleType} was not saved for ` +
            `${employeeNo} on ${date}.`,
        },
        { status: 500 },
      );
    }

    console.log(
      "[Schedules POST] saved row:",
      saved,
    );

    /* -------------------------------------------------------
       VERIFY
       ------------------------------------------------------- */

    if (saved.schedule_type !== scheduleType) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Schedule row exists, but schedule_type is ` +
            `"${saved.schedule_type}" instead of "${scheduleType}".`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        `Schedule ${scheduleType} saved successfully.`,
      data: saved,
    });
  } catch (error) {
    console.error(
      "POST /api/organization/shift-management/schedules failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save schedule.",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   DELETE
   =========================================================

   Body:
   {
     "employeeNo": "62000085",
     "date": "2026-09-05"
   }

   Hanya menghapus manual schedule:
   1 / 4

   OFF tetap ditangani oleh /off-days.

   ========================================================= */

export async function DELETE(
  request: NextRequest,
) {
  try {
    const body = (await request.json()) as {
      employeeNo?: unknown;
      date?: unknown;
    };

    const employeeNo =
      String(body.employeeNo ?? "").trim();

    const date =
      String(body.date ?? "").trim();

    if (!employeeNo) {
      return NextResponse.json(
        {
          success: false,
          error: "employeeNo is required.",
        },
        { status: 400 },
      );
    }

    if (!isValidDate(date)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "date must be in YYYY-MM-DD format.",
        },
        { status: 400 },
      );
    }

    await execute(
      `
        DELETE FROM shift_schedules
        WHERE employee_no = ?
          AND schedule_date = ?
          AND schedule_type IN ('1', '4')
      `,
      [
        employeeNo,
        date,
      ],
    );

    console.log(
      "[Schedules DELETE]",
      {
        employeeNo,
        date,
      },
    );

    return NextResponse.json({
      success: true,
      message:
        "Manual work schedule deleted successfully.",
      employeeNo,
      date,
    });
  } catch (error) {
    console.error(
      "DELETE /api/organization/shift-management/schedules failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete schedule.",
      },
      { status: 500 },
    );
  }
}