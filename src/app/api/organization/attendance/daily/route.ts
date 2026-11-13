import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type AttendanceDailyStoredValue = "10.5" | "8" | "4" | "OFF";
type AttendanceDailyRow = {
  id: number;
  employee_no: string;
  attendance_date: string;
  attendance_value:
    | AttendanceDailyStoredValue
    | "AL"
    | "MC"
    | "UPL"
    | "A"
    | "ALPA"
    | "OT"
    | "NO_ATTENDANCE";
  planned_hours: number;
  permission_hours: number;
  offday_regular_hours: number;
  overtime_hours: number;
  source: "SHIFT" | "LEAVE";
  leave_request_id: number | null;
  created_at: string;
  updated_at: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.organizationAttendanceRead);
  if (gate instanceof NextResponse) return gate;

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

    const uplHoursSql = `CASE
      WHEN lr.start_time IS NULL OR lr.end_time IS NULL THEN 0
      WHEN lr.start_time < '17:00:00' THEN
        GREATEST(0,
          (LEAST(TIME_TO_SEC(lr.end_time), 17 * 3600) -
           GREATEST(TIME_TO_SEC(lr.start_time), 8 * 3600)) / 3600
          - GREATEST(0,
            (LEAST(TIME_TO_SEC(lr.end_time), 13 * 3600) -
             GREATEST(TIME_TO_SEC(lr.start_time), 12 * 3600)) / 3600
          )
        ) + CEIL(GREATEST(0,
          (TIME_TO_SEC(lr.end_time) -
           TIME_TO_SEC(GREATEST(lr.start_time, '17:45:00'))) / 60
        ) / 30) / 2
      ELSE CEIL(GREATEST(0,
        (TIME_TO_SEC(lr.end_time) -
         TIME_TO_SEC(GREATEST(lr.start_time, '17:45:00'))) / 60
      ) / 30) / 2
    END`;

    const rows = await query<AttendanceDailyRow[]>(
        `
          SELECT
            ad.id,
            ad.employee_no,
            ad.attendance_date,

            CASE
              WHEN ad.source = 'LEAVE' AND lr.request_type = 'ALPA'
                THEN 'A'
              WHEN ad.source = 'LEAVE'
                THEN lr.request_type
              ELSE ad.attendance_value
            END AS attendance_value,

            CASE
              WHEN ad.source = 'LEAVE' AND lr.request_type = 'UPL'
                THEN GREATEST(0,
                  CASE
                    WHEN ss.schedule_type IN ('D', 'N') THEN 10.5
                    WHEN ss.schedule_type = '1' THEN 8
                    WHEN ss.schedule_type = '4' THEN 4
                    ELSE 0
                  END
                  - (${uplHoursSql})
                )
              ELSE ad.planned_hours
            END AS planned_hours,
            CASE
              WHEN ad.source = 'LEAVE' AND lr.request_type = 'UPL'
              THEN (${uplHoursSql})
              ELSE 0
            END AS permission_hours,
            COALESCE(ot.offday_regular_hours, 0) AS offday_regular_hours,
            COALESCE(ot.overtime_hours, 0) AS overtime_hours,
            ad.source,
            ad.leave_request_id,
            ad.created_at,
            ad.updated_at

          FROM attendance_daily ad

          LEFT JOIN attendance_leave_requests lr
            ON lr.id = ad.leave_request_id

          LEFT JOIN (
            SELECT employee_no, schedule_date, MAX(schedule_type) AS schedule_type
            FROM shift_schedules
            GROUP BY employee_no, schedule_date
          ) ss ON ss.employee_no = ad.employee_no AND ss.schedule_date = ad.attendance_date

          LEFT JOIN (
            SELECT employee_no, request_date,
                   SUM(CASE WHEN EXISTS (
                     SELECT 1 FROM shift_schedules off_shift
                     WHERE off_shift.employee_no = ot_request.employee_no
                       AND off_shift.schedule_date = ot_request.request_date
                       AND off_shift.schedule_type = 'OFF'
                   ) THEN GREATEST(0,
                     (LEAST(TIME_TO_SEC(end_time), 17 * 3600) -
                      GREATEST(TIME_TO_SEC(start_time), 8 * 3600)) / 3600
                     - GREATEST(0,
                       (LEAST(TIME_TO_SEC(end_time), 13 * 3600) -
                        GREATEST(TIME_TO_SEC(start_time), 12 * 3600)) / 3600
                     )
                   ) ELSE 0 END) AS offday_regular_hours,
                   SUM(CEIL(GREATEST(
                     (TIME_TO_SEC(end_time) -
                      TIME_TO_SEC(GREATEST(start_time, '17:45:00'))) / 60,
                     0
                   ) / 30) / 2) AS overtime_hours
            FROM attendance_leave_requests ot_request
            WHERE status = 'Approved' AND request_type = 'OT'
              AND start_time IS NOT NULL AND end_time IS NOT NULL
            GROUP BY employee_no, request_date
          ) ot ON ot.employee_no = ad.employee_no AND ot.request_date = ad.attendance_date

          WHERE ad.attendance_date >= ?
            AND ad.attendance_date < DATE_ADD(
              ?,
              INTERVAL 1 MONTH
            )

            ${employeeCondition}

          ORDER BY
            ad.employee_no ASC,
            ad.attendance_date ASC,
            ad.id ASC
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
