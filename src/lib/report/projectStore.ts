import { execute, query, withTransaction } from "@/lib/db";
import type { ResultSetHeader } from "mysql2";
import {
  mapProjectLineRow,
  mapProjectReportRow,
} from "./projectValidation";
import type {
  ReportProjectLineRow,
  ReportProjectPayload,
  ReportProjectReport,
  ReportProjectReportRow,
} from "./projectTypes";
import type mysql from "mysql2/promise";

const LIST_SELECT = `
  SELECT
    r.id,
    r.report_date,
    r.project_department,
    r.reporter_name,
    r.cycle_label,
    r.year,
    r.week_number,
    r.created_at,
    r.updated_at,
    COALESCE(agg.line_count, 0) AS line_count,
    COALESCE(agg.healthy_count, 0) AS healthy_count,
    COALESCE(agg.mild_count, 0) AS mild_count,
    COALESCE(agg.serious_count, 0) AS serious_count
  FROM report_project_reports r
  LEFT JOIN (
    SELECT
      report_id,
      COUNT(*) AS line_count,
      SUM(CASE WHEN health = 'healthy' THEN 1 ELSE 0 END) AS healthy_count,
      SUM(CASE WHEN health = 'mild' THEN 1 ELSE 0 END) AS mild_count,
      SUM(CASE WHEN health = 'serious' THEN 1 ELSE 0 END) AS serious_count
    FROM report_project_lines
    GROUP BY report_id
  ) agg ON agg.report_id = r.id
`;

export async function listProjectReports(filters: {
  year?: number;
  weekNumber?: number;
  q?: string;
}): Promise<ReportProjectReport[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.year != null) {
    where.push("r.year = ?");
    params.push(filters.year);
  }
  if (filters.weekNumber != null) {
    where.push("r.week_number = ?");
    params.push(filters.weekNumber);
  }
  if (filters.q) {
    where.push(
      `(r.project_department LIKE ? OR r.reporter_name LIKE ? OR r.cycle_label LIKE ?
        OR EXISTS (
          SELECT 1 FROM report_project_lines lx
          WHERE lx.report_id = r.id
            AND (lx.target LIKE ? OR lx.pic LIKE ? OR lx.main_task LIKE ?)
        ))`
    );
    const like = `%${filters.q}%`;
    params.push(like, like, like, like, like, like);
  }

  const sql = `
    ${LIST_SELECT}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY r.year DESC, r.week_number DESC, r.report_date DESC, r.id DESC
  `;

  const rows = await query<ReportProjectReportRow[]>(sql, params);
  return rows.map((row) => mapProjectReportRow(row));
}

export async function getProjectReportById(id: number): Promise<ReportProjectReport | null> {
  const rows = await query<ReportProjectReportRow[]>(
    `${LIST_SELECT} WHERE r.id = ? LIMIT 1`,
    [id]
  );
  const header = rows[0];
  if (!header) return null;

  const lineRows = await query<ReportProjectLineRow[]>(
    `
      SELECT *
      FROM report_project_lines
      WHERE report_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [id]
  );

  return mapProjectReportRow(header, lineRows.map(mapProjectLineRow));
}

async function insertLines(
  conn: mysql.PoolConnection,
  reportId: number,
  lines: ReportProjectPayload["lines"]
) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    await conn.query(
      `
        INSERT INTO report_project_lines (
          report_id, sort_order, target, main_task, current_priority,
          plan_start, plan_end, health, line_status, progress_ratio,
          pic, this_week_progress, next_week_plan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        reportId,
        i,
        line.target,
        line.mainTask,
        line.currentPriority,
        line.planStart,
        line.planEnd,
        line.health,
        line.lineStatus,
        line.progressRatio,
        line.pic,
        line.thisWeekProgress,
        line.nextWeekPlan,
      ]
    );
  }
}

export async function createProjectReport(payload: ReportProjectPayload): Promise<number> {
  return withTransaction(async (conn) => {
    const [insertResult] = await conn.query(
      `
        INSERT INTO report_project_reports (
          report_date, project_department, reporter_name, cycle_label, year, week_number
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        payload.reportDate,
        payload.projectDepartment,
        payload.reporterName,
        payload.cycleLabel,
        payload.year,
        payload.weekNumber,
      ]
    );
    const reportId = Number((insertResult as ResultSetHeader).insertId);
    await insertLines(conn, reportId, payload.lines);
    return reportId;
  });
}

export async function updateProjectReport(
  id: number,
  payload: ReportProjectPayload
): Promise<boolean> {
  return withTransaction(async (conn) => {
    const [result] = await conn.query(
      `
        UPDATE report_project_reports
        SET report_date = ?, project_department = ?, reporter_name = ?,
            cycle_label = ?, year = ?, week_number = ?
        WHERE id = ?
      `,
      [
        payload.reportDate,
        payload.projectDepartment,
        payload.reporterName,
        payload.cycleLabel,
        payload.year,
        payload.weekNumber,
        id,
      ]
    );
    if (Number((result as ResultSetHeader).affectedRows ?? 0) === 0) return false;

    await conn.query(`DELETE FROM report_project_lines WHERE report_id = ?`, [id]);
    await insertLines(conn, id, payload.lines);
    return true;
  });
}

export async function deleteProjectReport(id: number): Promise<boolean> {
  const result = await execute(`DELETE FROM report_project_reports WHERE id = ?`, [id]);
  return Number(result.affectedRows ?? 0) > 0;
}
