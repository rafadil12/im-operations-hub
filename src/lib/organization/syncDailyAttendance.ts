import { execute, query } from "@/lib/db";
import { attendanceSyncEvent, recordOrganization } from "@/lib/logs-center/organizationRemark";
import { suppressLogsCenter } from "@/lib/logs-center/record";

type ScheduleType = "D" | "N" | "1" | "4" | "OFF";
type LeaveType = "AL" | "MC" | "UPL" | "A" | "ALPA" | "OT" | "NO_ATTENDANCE";
type AttendanceValue = "10.5" | "8" | "4" | "OFF";
type EmployeeRow = { employee_no: string };
type ScheduleRow = { employee_no: string; schedule_date: string; schedule_type: ScheduleType };
type LeaveRow = { id: number; employee_no: string; request_date: string; request_type: LeaveType };
type ExistingRow = { id: number; employee_no: string; attendance_date: string };

export type DailyAttendanceSyncSummary = {
  year: number;
  month: number;
  employees: number;
  inserted: number;
  updated: number;
  skippedFuture: number;
  processed: number;
};

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

function shiftResult(schedule: ScheduleType | null): { value: AttendanceValue; hours: number } {
  if (schedule === "D" || schedule === "N") return { value: "10.5", hours: 10.5 };
  if (schedule === "1") return { value: "8", hours: 8 };
  if (schedule === "4") return { value: "4", hours: 4 };
  return { value: "OFF", hours: 0 };
}

export async function syncDailyAttendance(
  year: number,
  month: number,
  now = new Date(),
): Promise<DailyAttendanceSyncSummary> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("year must be a valid year.");
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("month must be between 1 and 12.");

  const monthStart = `${year}-${pad(month)}-01`;
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthDays = new Date(year, month, 0).getDate();
  const [employees, schedules, leaves, existing] = await Promise.all([
    query<EmployeeRow[]>(
      `SELECT employee_no FROM users
       WHERE employee_no IS NOT NULL AND employee_no <> '' AND employee_no <> 'SUPERADMIN'
       ORDER BY employee_no`,
    ),
    query<ScheduleRow[]>(
      `SELECT employee_no, schedule_date, schedule_type FROM shift_schedules
       WHERE schedule_date >= ? AND schedule_date < DATE_ADD(?, INTERVAL 1 MONTH)
       ORDER BY employee_no, schedule_date, id`,
      [monthStart, monthStart],
    ),
    query<LeaveRow[]>(
      `SELECT id, employee_no, request_date, request_type FROM attendance_leave_requests
       WHERE request_date >= ? AND request_date < DATE_ADD(?, INTERVAL 1 MONTH)
         AND status = 'Approved'
         AND request_type IN ('AL', 'MC', 'UPL', 'A', 'ALPA', 'OT', 'NO_ATTENDANCE')
       ORDER BY employee_no, request_date, id ASC`,
      [monthStart, monthStart],
    ),
    query<ExistingRow[]>(
      `SELECT id, employee_no, attendance_date FROM attendance_daily
       WHERE attendance_date >= ? AND attendance_date < DATE_ADD(?, INTERVAL 1 MONTH)`,
      [monthStart, monthStart],
    ),
  ]);

  const scheduleMap = new Map<string, ScheduleType>();
  for (const row of schedules) scheduleMap.set(`${row.employee_no}|${String(row.schedule_date).slice(0, 10)}`, row.schedule_type);
  const leaveMap = new Map<string, number>();
  for (const row of leaves) {
    if (row.request_type !== "OT" && row.request_type !== "NO_ATTENDANCE") {
      leaveMap.set(`${row.employee_no}|${String(row.request_date).slice(0, 10)}`, row.id);
    }
  }
  const existingMap = new Map<string, number>();
  for (const row of existing) existingMap.set(`${row.employee_no}|${String(row.attendance_date).slice(0, 10)}`, row.id);

  const values: Array<[string, string, AttendanceValue, number, "SHIFT" | "LEAVE", number | null]> = [];
  let skippedFuture = 0;
  let inserted = 0;
  let updated = 0;
  for (const employee of employees) {
    for (let day = 1; day <= monthDays; day++) {
      if (new Date(year, month - 1, day) > cutoff) {
        skippedFuture++;
        continue;
      }
      const attendanceDate = dateKey(year, month, day);
      const key = `${employee.employee_no}|${attendanceDate}`;
      const leaveRequestId = leaveMap.get(key) ?? null;
      const shift = shiftResult(scheduleMap.get(key) ?? null);
      if (existingMap.has(key)) updated++;
      else inserted++;
      values.push([
        employee.employee_no,
        attendanceDate,
        leaveRequestId == null ? shift.value : "OFF",
        leaveRequestId == null ? shift.hours : 0,
        leaveRequestId == null ? "SHIFT" : "LEAVE",
        leaveRequestId,
      ]);
    }
  }

  await suppressLogsCenter(async () => {
    for (let index = 0; index < values.length; index += 500) {
      const chunk = values.slice(index, index + 500);
      if (!chunk.length) continue;
      await execute(
        `INSERT INTO attendance_daily
          (employee_no, attendance_date, attendance_value, planned_hours, source, leave_request_id)
         VALUES ${chunk.map(() => "(?, ?, ?, ?, ?, ?)").join(", ")}
         ON DUPLICATE KEY UPDATE
          attendance_value = VALUES(attendance_value), planned_hours = VALUES(planned_hours),
          source = VALUES(source), leave_request_id = VALUES(leave_request_id),
          updated_at = CURRENT_TIMESTAMP`,
        chunk.flat(),
      );
    }
  });

  await recordOrganization(attendanceSyncEvent(year, month, inserted, updated));
  return { year, month, employees: employees.length, inserted, updated, skippedFuture, processed: values.length };
}
