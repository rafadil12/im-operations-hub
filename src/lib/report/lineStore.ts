import { execute, query } from "@/lib/db";
import { mapReportLineRow } from "./apiHelpers";
import type {
  ReportArea,
  ReportSubItem,
  ReportLine,
  ReportLineInput,
  ReportLineRow,
  ReportWeek,
  ReportWeekSubmission,
} from "./types";
import { formatDateOnly, getSaturdayForWeek, weekLabel } from "./weekCalendar";

export async function loadReportAreas(): Promise<ReportArea[]> {
  const rows = await query<
    { id: number; code: string; name_en: string; name_cn: string; sort_order: number }[]
  >(
    `SELECT id, code, name_en, name_cn, sort_order FROM report_areas ORDER BY sort_order ASC, id ASC`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    code: r.code,
    nameEn: r.name_en,
    nameCn: r.name_cn,
    sortOrder: Number(r.sort_order),
  }));
}

export async function loadReportSubItems(areaId?: number): Promise<ReportSubItem[]> {
  const params: number[] = [];
  let sql = `
    SELECT id, area_id, name_en, name_cn, sort_order
    FROM report_sub_items
  `;
  if (areaId != null) {
    sql += ` WHERE area_id = ?`;
    params.push(areaId);
  }
  sql += ` ORDER BY area_id ASC, sort_order ASC, id ASC`;

  const rows = await query<
    { id: number; area_id: number; name_en: string; name_cn: string; sort_order: number }[]
  >(sql, params);

  return rows.map((r) => ({
    id: Number(r.id),
    areaId: Number(r.area_id),
    nameEn: r.name_en,
    nameCn: r.name_cn,
    sortOrder: Number(r.sort_order),
  }));
}

export async function ensureReportWeek(year: number, weekNumber: number): Promise<number> {
  const existing = await query<{ id: number }[]>(
    `SELECT id FROM report_weeks WHERE year = ? AND week_number = ? LIMIT 1`,
    [year, weekNumber]
  );
  if (existing[0]) return Number(existing[0].id);

  const saturday = getSaturdayForWeek(year, weekNumber);
  const friday = new Date(saturday);
  friday.setDate(friday.getDate() + 6);

  const result = await execute(
    `INSERT INTO report_weeks (year, week_number, label, starts_on, ends_on, report_due_on)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      year,
      weekNumber,
      weekLabel(weekNumber, "cn"),
      formatDateOnly(saturday),
      formatDateOnly(friday),
      formatDateOnly(friday),
    ]
  );
  return Number(result.insertId);
}

export async function loadReportWeeks(year?: number): Promise<ReportWeek[]> {
  const params: number[] = [];
  let sql = `
    SELECT id, year, week_number, label, starts_on, ends_on, report_due_on
    FROM report_weeks
  `;
  if (year != null) {
    sql += ` WHERE year = ?`;
    params.push(year);
  }
  sql += ` ORDER BY year DESC, week_number DESC`;

  const rows = await query<
    {
      id: number;
      year: number;
      week_number: number;
      label: string;
      starts_on: string;
      ends_on: string;
      report_due_on: string;
    }[]
  >(sql, params);

  return rows.map((r) => ({
    id: Number(r.id),
    year: Number(r.year),
    weekNumber: Number(r.week_number),
    label: r.label,
    startsOn: String(r.starts_on).slice(0, 10),
    endsOn: String(r.ends_on).slice(0, 10),
    reportDueOn: String(r.report_due_on).slice(0, 10),
  }));
}

export async function loadReportLines(filters: {
  year?: number;
  weekNumber?: number;
  weekId?: number;
  areaId?: number;
}): Promise<ReportLine[]> {
  const clauses: string[] = [];
  const params: (number | string)[] = [];

  if (filters.weekId != null) {
    clauses.push(`rl.week_id = ?`);
    params.push(filters.weekId);
  }
  if (filters.year != null) {
    clauses.push(`rw.year = ?`);
    params.push(filters.year);
  }
  if (filters.weekNumber != null) {
    clauses.push(`rw.week_number = ?`);
    params.push(filters.weekNumber);
  }
  if (filters.areaId != null) {
    clauses.push(`rl.area_id = ?`);
    params.push(filters.areaId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = await query<ReportLineRow[]>(
    `
      SELECT
        rl.id,
        rl.week_id,
        rl.area_id,
        rl.sub_item_id,
        si.name_en AS sub_item_name_en,
        si.name_cn AS sub_item_name_cn,
        rl.work_target_en,
        rl.work_target_cn,
        rl.weekly_completion_rate,
        rl.summary_en,
        rl.summary_cn,
        rl.plan_en,
        rl.plan_cn,
        rl.sort_order,
        rw.year,
        rw.week_number,
        ra.code AS area_code,
        ra.name_en AS area_name_en,
        ra.name_cn AS area_name_cn,
        rws.status AS submission_status
      FROM report_lines rl
      JOIN report_weeks rw ON rw.id = rl.week_id
      JOIN report_areas ra ON ra.id = rl.area_id
      LEFT JOIN report_sub_items si ON si.id = rl.sub_item_id
      LEFT JOIN report_week_submissions rws
        ON rws.week_id = rl.week_id AND rws.area_id = rl.area_id
      ${where}
      ORDER BY rw.year DESC, rw.week_number DESC, ra.sort_order ASC, rl.sort_order ASC, rl.id ASC
    `,
    params
  );

  return rows.map(mapReportLineRow);
}

export async function loadReportLinesForOverview(year: number): Promise<ReportLineRow[]> {
  return query<ReportLineRow[]>(
    `
      SELECT
        rl.id,
        rl.week_id,
        rl.area_id,
        rl.sub_item_id,
        si.name_en AS sub_item_name_en,
        si.name_cn AS sub_item_name_cn,
        rl.work_target_en,
        rl.work_target_cn,
        rl.weekly_completion_rate,
        rl.summary_en,
        rl.summary_cn,
        rl.plan_en,
        rl.plan_cn,
        rl.sort_order,
        rw.year,
        rw.week_number,
        ra.code AS area_code,
        ra.name_en AS area_name_en,
        ra.name_cn AS area_name_cn,
        rws.status AS submission_status
      FROM report_lines rl
      JOIN report_weeks rw ON rw.id = rl.week_id
      JOIN report_areas ra ON ra.id = rl.area_id
      LEFT JOIN report_sub_items si ON si.id = rl.sub_item_id
      LEFT JOIN report_week_submissions rws
        ON rws.week_id = rl.week_id AND rws.area_id = rl.area_id
      WHERE rw.year = ?
      ORDER BY rw.week_number DESC, ra.sort_order ASC, rl.sort_order ASC, rl.id ASC
    `,
    [year]
  );
}

export async function loadReportSubmissions(filters: {
  year?: number;
  weekId?: number;
  areaId?: number;
}): Promise<ReportWeekSubmission[]> {
  const clauses: string[] = [];
  const params: number[] = [];

  if (filters.year != null) {
    clauses.push(`rw.year = ?`);
    params.push(filters.year);
  }
  if (filters.weekId != null) {
    clauses.push(`rws.week_id = ?`);
    params.push(filters.weekId);
  }
  if (filters.areaId != null) {
    clauses.push(`rws.area_id = ?`);
    params.push(filters.areaId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = await query<
    {
      id: number;
      week_id: number;
      area_id: number;
      status: "draft" | "submitted";
      submitted_at: string | null;
      submitted_by_system_user_id: number | null;
      submitted_by_label: string | null;
    }[]
  >(
    `
      SELECT
        rws.id,
        rws.week_id,
        rws.area_id,
        rws.status,
        rws.submitted_at,
        rws.submitted_by_system_user_id,
        rws.submitted_by_label
      FROM report_week_submissions rws
      JOIN report_weeks rw ON rw.id = rws.week_id
      ${where}
      ORDER BY rw.year DESC, rw.week_number DESC, rws.area_id ASC
    `,
    params
  );

  return rows.map((r) => ({
    id: Number(r.id),
    weekId: Number(r.week_id),
    areaId: Number(r.area_id),
    status: r.status,
    submittedAt: r.submitted_at,
    submittedBySystemUserId:
      r.submitted_by_system_user_id != null ? Number(r.submitted_by_system_user_id) : null,
    submittedByLabel: r.submitted_by_label,
  }));
}

export async function getSubmissionStatus(
  weekId: number,
  areaId: number
): Promise<ReportWeekSubmission | null> {
  const rows = await query<
    {
      id: number;
      week_id: number;
      area_id: number;
      status: "draft" | "submitted";
      submitted_at: string | null;
      submitted_by_system_user_id: number | null;
      submitted_by_label: string | null;
    }[]
  >(
    `SELECT id, week_id, area_id, status, submitted_at,
            submitted_by_system_user_id, submitted_by_label
     FROM report_week_submissions
     WHERE week_id = ? AND area_id = ?
     LIMIT 1`,
    [weekId, areaId]
  );
  if (!rows[0]) return null;
  return {
    id: Number(rows[0].id),
    weekId: Number(rows[0].week_id),
    areaId: Number(rows[0].area_id),
    status: rows[0].status,
    submittedAt: rows[0].submitted_at,
    submittedBySystemUserId:
      rows[0].submitted_by_system_user_id != null
        ? Number(rows[0].submitted_by_system_user_id)
        : null,
    submittedByLabel: rows[0].submitted_by_label,
  };
}

export async function insertReportLine(input: ReportLineInput): Promise<number> {
  const result = await execute(
    `
      INSERT INTO report_lines (
        week_id, area_id, sub_item_id,
        work_target_en, work_target_cn, weekly_completion_rate,
        summary_en, summary_cn, plan_en, plan_cn, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.weekId,
      input.areaId,
      input.subItemId ?? null,
      input.workTargetEn,
      input.workTargetCn,
      input.weeklyCompletionRate ?? null,
      input.summaryEn,
      input.summaryCn,
      input.planEn ?? null,
      input.planCn ?? null,
      input.sortOrder ?? 0,
    ]
  );
  return Number(result.insertId);
}

export async function updateReportLine(id: number, input: Partial<ReportLineInput>): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];

  const set = (col: string, val: unknown) => {
    fields.push(`${col} = ?`);
    params.push(val);
  };

  if (input.subItemId !== undefined) set("sub_item_id", input.subItemId);
  if (input.workTargetEn !== undefined) set("work_target_en", input.workTargetEn);
  if (input.workTargetCn !== undefined) set("work_target_cn", input.workTargetCn);
  if (input.weeklyCompletionRate !== undefined) set("weekly_completion_rate", input.weeklyCompletionRate);
  if (input.summaryEn !== undefined) set("summary_en", input.summaryEn);
  if (input.summaryCn !== undefined) set("summary_cn", input.summaryCn);
  if (input.planEn !== undefined) set("plan_en", input.planEn);
  if (input.planCn !== undefined) set("plan_cn", input.planCn);
  if (input.sortOrder !== undefined) set("sort_order", input.sortOrder);

  if (!fields.length) return;

  params.push(id);
  await execute(`UPDATE report_lines SET ${fields.join(", ")} WHERE id = ?`, params);
}

export async function deleteReportLine(id: number): Promise<void> {
  await execute(`DELETE FROM report_lines WHERE id = ?`, [id]);
}

export async function ensureDraftSubmission(weekId: number, areaId: number): Promise<void> {
  await execute(
    `
      INSERT INTO report_week_submissions (week_id, area_id, status)
      VALUES (?, ?, 'draft')
      ON DUPLICATE KEY UPDATE week_id = week_id
    `,
    [weekId, areaId]
  );
}

export async function submitReportArea(
  weekId: number,
  areaId: number,
  submittedBySystemUserId?: number | null,
  submittedByLabel?: string | null
): Promise<void> {
  await execute(
    `
      INSERT INTO report_week_submissions
        (week_id, area_id, status, submitted_at, submitted_by_system_user_id, submitted_by_label)
      VALUES (?, ?, 'submitted', NOW(), ?, ?)
      ON DUPLICATE KEY UPDATE
        status = 'submitted',
        submitted_at = NOW(),
        submitted_by_system_user_id = VALUES(submitted_by_system_user_id),
        submitted_by_label = VALUES(submitted_by_label)
    `,
    [weekId, areaId, submittedBySystemUserId ?? null, submittedByLabel ?? null]
  );
}

export async function reopenReportArea(weekId: number, areaId: number): Promise<boolean> {
  const result = await execute(
    `
      UPDATE report_week_submissions
      SET status = 'draft',
          submitted_at = NULL,
          submitted_by_system_user_id = NULL,
          submitted_by_label = NULL
      WHERE week_id = ? AND area_id = ? AND status = 'submitted'
    `,
    [weekId, areaId]
  );
  return Number(result.affectedRows ?? 0) > 0;
}

export async function getReportLineById(id: number): Promise<ReportLine | null> {
  const rows = await query<ReportLineRow[]>(
    `
      SELECT
        rl.id, rl.week_id, rl.area_id, rl.sub_item_id,
        si.name_en AS sub_item_name_en, si.name_cn AS sub_item_name_cn,
        rl.work_target_en, rl.work_target_cn, rl.weekly_completion_rate,
        rl.summary_en, rl.summary_cn, rl.plan_en, rl.plan_cn, rl.sort_order
      FROM report_lines rl
      LEFT JOIN report_sub_items si ON si.id = rl.sub_item_id
      WHERE rl.id = ?
      LIMIT 1
    `,
    [id]
  );
  return rows[0] ? mapReportLineRow(rows[0]) : null;
}
