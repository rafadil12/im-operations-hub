export type AttendanceShift = "D" | "N" | "1" | "4" | "OFF";

export type AttendanceRosterRow = {
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  division_name_en: string | null;
  division_name_cn: string | null;
  schedule_type: AttendanceShift;
  leave_type: string | null;
  is_rolling: number;
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
      FROM shift_schedules ss
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
      WHERE ss.schedule_date = ?
        AND u.employee_no <> 'SUPERADMIN'
      ORDER BY
        FIELD(ss.schedule_type, 'D', 'N', '1', '4', 'OFF'),
        COALESCE(d.name_en, d.name_cn, ''),
        COALESCE(u.name_en, u.name_cn, u.employee_no)
    `,
    [date]
  );

  const scheduled = rows.filter((row) => row.schedule_type !== "OFF");
  const leave = scheduled.filter((row) => Boolean(row.leave_type));
  const working = scheduled.filter((row) => !row.leave_type);
  const off = rows.filter((row) => row.schedule_type === "OFF");

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
