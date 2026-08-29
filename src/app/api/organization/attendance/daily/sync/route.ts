import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";

export const dynamic = "force-dynamic";

type ScheduleType = "D" | "N" | "1" | "4" | "OFF";
type LeaveType = "AL" | "MC" | "UPL" | "A" | "OT";
type AttendanceValue = "10.5" | "8" | "4" | "OFF" | "AL" | "MC" | "UPL" | "A";

type EmployeeRow = {
  employee_no: string;
};

type ScheduleRow = {
  employee_no: string;
  schedule_date: string;
  schedule_type: ScheduleType;
};

type LeaveRow = {
  id: number;
  employee_no: string;
  request_date: string;
  request_type: LeaveType;
  status: "Pending" | "Approved" | "Rejected";
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function shiftResult(schedule: ScheduleType | null): {
  value: AttendanceValue;
  plannedHours: number;
} {
  switch (schedule) {
    case "D":
    case "N":
      return { value: "10.5", plannedHours: 10.5 };
    case "1":
      return { value: "8", plannedHours: 8 };
    case "4":
      return { value: "4", plannedHours: 4 };
    case "OFF":
      return { value: "OFF", plannedHours: 0 };
    default:
      return { value: "OFF", plannedHours: 0 };
  }
}

function nonFutureCutoff(today = new Date()) {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      year?: unknown;
      month?: unknown;
    };

    const now = new Date();

    const year =
      body.year !== undefined ? Number(body.year) : now.getFullYear();

    const month =
      body.month !== undefined
        ? Number(body.month)
        : now.getMonth() + 1;

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { success: false, error: "year must be a valid year." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, error: "month must be between 1 and 12." },
        { status: 400 },
      );
    }

    const monthStart = `${year}-${pad(month)}-01`;
    const today = nonFutureCutoff(now);
    const monthDays = new Date(year, month, 0).getDate();

    const employees = await query<EmployeeRow[]>(
      `
        SELECT employee_no
        FROM users
        WHERE employee_no IS NOT NULL
          AND employee_no <> ''
          AND employee_no <> 'SUPERADMIN'
        ORDER BY employee_no
      `,
    );

    /*
     * This uses the real Shift Management table from the uploaded API:
     * shift_schedules.
     */
    const schedules = await query<ScheduleRow[]>(
      `
        SELECT
          employee_no,
          schedule_date,
          schedule_type
        FROM shift_schedules
        WHERE schedule_date >= ?
          AND schedule_date < DATE_ADD(?, INTERVAL 1 MONTH)
        ORDER BY employee_no, schedule_date, id
      `,
      [monthStart, monthStart],
    );

    const leaveRows = await query<LeaveRow[]>(
      `
        SELECT
          id,
          employee_no,
          request_date,
          request_type,
          status
        FROM attendance_leave_requests
        WHERE request_date >= ?
          AND request_date < DATE_ADD(?, INTERVAL 1 MONTH)
          AND request_type IN ('AL', 'MC', 'UPL', 'A', 'OT')
        ORDER BY employee_no, request_date, id ASC
      `,
      [monthStart, monthStart],
    );

    const scheduleMap = new Map<string, ScheduleType>();

    for (const row of schedules) {
      scheduleMap.set(
        `${row.employee_no}|${String(row.schedule_date).slice(0, 10)}`,
        row.schedule_type,
      );
    }

    /*
     * Business rule:
     * - AL / MC / UPL / A immediately override attendance.
     * - Approval status is intentionally ignored.
     * - OT is ignored by Daily Attendance.
     * - If multiple non-OT leave requests exist on the same day,
     *   the latest request (highest id) wins.
     */
    const leaveMap = new Map<
      string,
      Array<{ id: number; requestType: Exclude<LeaveType, "OT"> }>
    >();

    for (const row of leaveRows) {
      if (row.request_type === "OT") continue;

      const key = `${row.employee_no}|${String(row.request_date).slice(0, 10)}`;
      const list = leaveMap.get(key) ?? [];

      list.push({
        id: row.id,
        requestType: row.request_type,
      });

      leaveMap.set(key, list);
    }

    let inserted = 0;
    let updated = 0;
    let skippedFuture = 0;

    for (const employee of employees) {
      for (let day = 1; day <= monthDays; day++) {
        const cellDate = new Date(year, month - 1, day);

        if (cellDate > today) {
          skippedFuture++;
          continue;
        }

        const attendanceDate = toDateKey(year, month, day);
        const key = `${employee.employee_no}|${attendanceDate}`;

        const leaveForDay = leaveMap.get(key) ?? [];

        let value: AttendanceValue;
        let plannedHours: number;
        let source: "SHIFT" | "LEAVE";
        let leaveRequestId: number | null;

        if (leaveForDay.length > 0) {
          const latest = leaveForDay[leaveForDay.length - 1];

          value = latest.requestType;
          plannedHours = 0;
          source = "LEAVE";
          leaveRequestId = latest.id;
        } else {
          const result = shiftResult(scheduleMap.get(key) ?? null);

          value = result.value;
          plannedHours = result.plannedHours;
          source = "SHIFT";
          leaveRequestId = null;
        }

        const existing = await query<{ id: number }[]>(
          `
            SELECT id
            FROM attendance_daily
            WHERE employee_no = ?
              AND attendance_date = ?
            LIMIT 1
          `,
          [employee.employee_no, attendanceDate],
        );

        await execute(
          `
            INSERT INTO attendance_daily (
              employee_no,
              attendance_date,
              attendance_value,
              planned_hours,
              source,
              leave_request_id
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              attendance_value = VALUES(attendance_value),
              planned_hours = VALUES(planned_hours),
              source = VALUES(source),
              leave_request_id = VALUES(leave_request_id),
              updated_at = CURRENT_TIMESTAMP
          `,
          [
            employee.employee_no,
            attendanceDate,
            value,
            plannedHours,
            source,
            leaveRequestId,
          ],
        );

        if (existing.length > 0) {
          updated++;
        } else {
          inserted++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Daily attendance synchronized successfully.",
      summary: {
        year,
        month,
        employees: employees.length,
        inserted,
        updated,
        skippedFuture,
      },
    });
  } catch (error) {
    console.error(
      "POST /api/organization/attendance/daily/sync failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to synchronize daily attendance.",
      },
      { status: 500 },
    );
  }
}
