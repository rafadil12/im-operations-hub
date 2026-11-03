export type AttendanceShift = "D" | "N" | "1" | "4" | "OFF";

export type AttendanceRosterRow = {
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  division_name_en: string | null;
  division_name_cn: string | null;
  schedule_type: AttendanceShift;
  leave_type: string | null;
  request_start_time: string | null;
  request_end_time: string | null;
  is_rolling: number;
  work_hours: number;
};

export type AttendanceRoster = {
  date: string;
  scheduled: AttendanceRosterRow[];
  working: AttendanceRosterRow[];
  leave: AttendanceRosterRow[];
  off: AttendanceRosterRow[];
};

const SHIFT_LABELS: Record<AttendanceShift, string> = {
  D: "Day Shift",
  N: "Night Shift",
  "1": "Shift 1 / 8 Hours",
  "4": "Shift 4 / 4 Hours",
  OFF: "Off",
};

function employeeName(row: AttendanceRosterRow) {
  const names = [row.name_cn?.trim(), row.name_en?.trim()].filter(Boolean);
  return names.length > 0 ? names.join(" / ") : row.employee_no;
}

function divisionName(row: AttendanceRosterRow) {
  return row.division_name_en?.trim() || row.division_name_cn?.trim() || "-";
}

function rosterLine(row: AttendanceRosterRow) {
  return `• ${employeeName(row)} (${row.employee_no}) · ${divisionName(row)}`;
}

function section(title: string, rows: AttendanceRosterRow[]) {
  if (rows.length === 0) return [`**${title} (0)**`, "• -"];
  return [`**${title} (${rows.length})**`, ...rows.map(rosterLine)];
}

function leaveSection(rows: AttendanceRosterRow[]) {
  if (rows.length === 0) return ["**Leave / Absent (0)**", "• -"];
  return [
    `**Leave / Absent (${rows.length})**`,
    ...rows.map((row) => `${rosterLine(row)} · ${row.leave_type ?? "Leave"}`),
  ];
}

export function dateInTimeZone(
  now = new Date(),
  timeZone = process.env.ATTENDANCE_TIME_ZONE || "Asia/Jakarta"
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function loadAttendanceRoster(date: string): Promise<AttendanceRoster> {
  const { query } = await import("@/lib/db");
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
  const rows = await query<AttendanceRosterRow[]>(
    `
      SELECT
        u.employee_no,
        u.name_en,
        u.name_cn,
        d.name_en AS division_name_en,
        d.name_cn AS division_name_cn,
        ss.schedule_type,
        EXISTS (
          SELECT 1
          FROM shift_rotation_members srm
          WHERE srm.employee_organization_id = eo.id
            AND srm.rotation_rule_id = ss.rotation_rule_id
            AND srm.is_active = 1
        ) AS is_rolling,
        CASE
          WHEN lr.request_type = 'ALPA' THEN 'A'
          ELSE lr.request_type
        END AS leave_type
        ,lr.start_time AS request_start_time
        ,lr.end_time AS request_end_time
        ,CASE
          WHEN ss.schedule_type = 'OFF' THEN
            COALESCE(ot.offday_regular_hours, 0) + COALESCE(ot.overtime_hours, 0)
          WHEN lr.request_type IN ('AL', 'MC', 'A', 'ALPA') THEN
            COALESCE(ot.overtime_hours, 0)
          ELSE GREATEST(0,
            CASE
              WHEN ss.schedule_type IN ('D', 'N') THEN 10.5
              WHEN ss.schedule_type = '1' THEN 8
              WHEN ss.schedule_type = '4' THEN 4
              ELSE 0
            END - CASE WHEN lr.request_type = 'UPL' THEN (${uplHoursSql}) ELSE 0 END
          ) + COALESCE(ot.overtime_hours, 0)
        END AS work_hours
      FROM (
        SELECT employee_no, schedule_date, schedule_type, MAX(rotation_rule_id) AS rotation_rule_id
        FROM shift_schedules
        WHERE schedule_date = ?
        GROUP BY employee_no, schedule_date, schedule_type
        UNION
        SELECT employee_no, request_date AS schedule_date, 'OFF' AS schedule_type, NULL AS rotation_rule_id
        FROM attendance_leave_requests
        WHERE request_date = ? AND status = 'Approved'
          AND request_type IN ('AL', 'MC', 'UPL', 'A', 'ALPA')
          AND NOT EXISTS (
            SELECT 1 FROM shift_schedules scheduled
            WHERE scheduled.employee_no = attendance_leave_requests.employee_no
              AND scheduled.schedule_date = attendance_leave_requests.request_date
          )
      ) ss
      INNER JOIN users u
        ON u.employee_no = ss.employee_no
      INNER JOIN employee_organization eo
        ON eo.user_id = u.id
       AND eo.employment_status = 'Active'
      LEFT JOIN divisions d
        ON d.id = u.division_id
      LEFT JOIN attendance_leave_requests lr
        ON lr.id = (
          SELECT latest_lr.id
          FROM attendance_leave_requests latest_lr
          WHERE latest_lr.employee_no = ss.employee_no
            AND latest_lr.request_date = ss.schedule_date
            AND latest_lr.status = 'Approved'
            AND latest_lr.request_type IN ('AL', 'MC', 'UPL', 'A', 'ALPA')
          ORDER BY latest_lr.id DESC
          LIMIT 1
        )
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
          SUM(CEIL(GREATEST(0,
            (TIME_TO_SEC(end_time) -
             TIME_TO_SEC(GREATEST(start_time, '17:45:00'))) / 60
          ) / 30) / 2) AS overtime_hours
        FROM attendance_leave_requests ot_request
        WHERE status = 'Approved' AND request_type = 'OT'
          AND start_time IS NOT NULL AND end_time IS NOT NULL
        GROUP BY employee_no, request_date
      ) ot ON ot.employee_no = ss.employee_no AND ot.request_date = ss.schedule_date
      WHERE ss.schedule_date = ?
        AND u.employee_no <> 'SUPERADMIN'
      ORDER BY
        FIELD(ss.schedule_type, 'D', 'N', '1', '4', 'OFF'),
        COALESCE(d.name_en, d.name_cn, ''),
        COALESCE(u.name_en, u.name_cn, u.employee_no)
    `,
    [date, date, date]
  );

  const scheduled = rows.filter((row) => row.schedule_type !== "OFF");
  const leave = rows.filter((row) => Boolean(row.leave_type));
  const working = scheduled.filter((row) => !row.leave_type);
  const off = rows.filter((row) => row.schedule_type === "OFF" && !row.leave_type);

  return { date, scheduled, working, leave, off };
}

export function formatAttendanceRoster(roster: AttendanceRoster) {
  const groups: Array<[AttendanceShift, string]> = [
    ["D", "Day Shift"],
    ["N", "Night Shift"],
    ["1", "Shift 1 / 8 Hours"],
    ["4", "Shift 4 / 4 Hours"],
  ];
  const lines = [
    `<font color="info">**Daily Staff Attendance & Shift Summary**</font>`,
    `**Date:** ${roster.date}`,
    "",
    `> Scheduled: **${roster.scheduled.length}** · Expected in: **${roster.working.length}** · Leave/Absent: **${roster.leave.length}** · Off: **${roster.off.length}**`,
    "",
  ];

  for (const [shift, title] of groups) {
    const rows = roster.working.filter((row) => row.schedule_type === shift);
    lines.push(...section(title, rows), "");
  }

  lines.push(...leaveSection(roster.leave));
  lines.push("", `<font color="comment">Source: Shift Schedule & Approved Leave</font>`);
  return lines.join("\n");
}

export function attendanceSummary(roster: AttendanceRoster) {
  const intelligentLogistics = (row: AttendanceRosterRow) =>
    `${row.division_name_en ?? ""} ${row.division_name_cn ?? ""}`
      .toLowerCase()
      .includes("intelligent logistics");

  return {
    date: roster.date,
    scheduled: roster.scheduled.length,
    expectedIn: roster.working.length,
    leaveOrAbsent: roster.leave.length,
    off: roster.off.length,
    shifts: {
      [SHIFT_LABELS.D]: roster.working
        .filter(
          (row) => row.schedule_type === "D" && row.is_rolling === 1 && intelligentLogistics(row)
        )
        .slice(0, 2).length,
      [SHIFT_LABELS.N]: roster.working
        .filter(
          (row) => row.schedule_type === "N" && row.is_rolling === 1 && intelligentLogistics(row)
        )
        .slice(0, 2).length,
    },
  };
}
