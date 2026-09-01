import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { withTransaction } from "@/lib/db";
import { mapReportLineRow } from "./apiHelpers";
import type { ReportLine, ReportLineInput, ReportLineRow } from "./types";
import { validateWeekLinePayload } from "./weekFormValidation";
import {
  ensureDraftSubmission,
  ensureReportWeek,
  getSubmissionStatus,
  loadReportLines,
} from "./lineStore";

export type ReportWeekLinePayload = {
  id?: number;
  subItemId: number;
  workTargetEn: string;
  workTargetCn: string;
  weeklyCompletionRate?: number | null;
  summaryEn: string;
  summaryCn: string;
  planEn?: string | null;
  planCn?: string | null;
};

export type SaveWeekReportAudit = {
  changedBySystemUserId?: number | null;
  changedByLabel?: string | null;
};

type LineSnapshot = {
  subItemId: number | null;
  workTargetEn: string;
  workTargetCn: string;
  weeklyCompletionRate: number | null;
  summaryEn: string;
  summaryCn: string;
  planEn: string | null;
  planCn: string | null;
};

function lineToSnapshot(row: ReportLineRow): LineSnapshot {
  return {
    subItemId: row.sub_item_id != null ? Number(row.sub_item_id) : null,
    workTargetEn: row.work_target_en,
    workTargetCn: row.work_target_cn,
    weeklyCompletionRate:
      row.weekly_completion_rate != null ? Number(row.weekly_completion_rate) : null,
    summaryEn: row.summary_en,
    summaryCn: row.summary_cn,
    planEn: row.plan_en,
    planCn: row.plan_cn,
  };
}

async function nextRevisionNo(conn: PoolConnection, lineId: number): Promise<number> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT COALESCE(MAX(revision_no), 0) + 1 AS next_no
     FROM report_line_revisions WHERE line_id = ?`,
    [lineId]
  );
  return Number(rows[0]?.next_no ?? 1);
}

async function insertRevision(
  conn: PoolConnection,
  lineId: number,
  snapshot: LineSnapshot,
  audit: SaveWeekReportAudit
): Promise<void> {
  const revisionNo = await nextRevisionNo(conn, lineId);
  await conn.query(
    `INSERT INTO report_line_revisions
       (line_id, revision_no, changed_by_system_user_id, changed_by_label, snapshot)
     VALUES (?, ?, ?, ?, ?)`,
    [
      lineId,
      revisionNo,
      audit.changedBySystemUserId ?? null,
      audit.changedByLabel ?? null,
      JSON.stringify(snapshot),
    ]
  );
}

function validateWeekLines(lines: ReportWeekLinePayload[]): string | null {
  if (!lines.length) return "At least one line is required.";
  const seen = new Set<number>();
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.subItemId) return "Sub-item is required on every line.";
    if (seen.has(line.subItemId)) return "Duplicate sub-item in the same week report.";
    seen.add(line.subItemId);
    const bilingualError = validateWeekLinePayload(line, i);
    if (bilingualError) return bilingualError;
  }
  return null;
}

async function fetchLineRow(conn: PoolConnection, id: number): Promise<ReportLineRow | null> {
  const [rows] = await conn.query<(ReportLineRow & RowDataPacket)[]>(
    `SELECT
       rl.id, rl.week_id, rl.area_id, rl.sub_item_id,
       si.name_en AS sub_item_name_en, si.name_cn AS sub_item_name_cn,
       rl.work_target_en, rl.work_target_cn, rl.weekly_completion_rate,
       rl.summary_en, rl.summary_cn, rl.plan_en, rl.plan_cn, rl.sort_order
     FROM report_lines rl
     LEFT JOIN report_sub_items si ON si.id = rl.sub_item_id
     WHERE rl.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function saveReportWeekLines(
  year: number,
  weekNumber: number,
  areaId: number,
  lines: ReportWeekLinePayload[],
  audit: SaveWeekReportAudit = {}
): Promise<ReportLine[]> {
  const validationError = validateWeekLines(lines);
  if (validationError) throw new Error(validationError);

  const weekId = await ensureReportWeek(year, weekNumber);
  const submission = await getSubmissionStatus(weekId, areaId);
  if (submission?.status === "submitted") {
    throw new Error("This week report is submitted and cannot be edited.");
  }

  await ensureDraftSubmission(weekId, areaId);

  const existing = await loadReportLines({ weekId, areaId });
  const existingById = new Map(existing.map((l) => [l.id, l]));
  const payloadIds = new Set(lines.filter((l) => l.id != null).map((l) => Number(l.id)));

  for (const id of payloadIds) {
    const row = existingById.get(id);
    if (!row || row.weekId !== weekId || row.areaId !== areaId) {
      throw new Error(`Line ${id} does not belong to this week report.`);
    }
  }

  await withTransaction(async (conn) => {
    for (const old of existing) {
      if (payloadIds.has(old.id)) continue;
      const row = await fetchLineRow(conn, old.id);
      if (row) {
        await insertRevision(conn, old.id, lineToSnapshot(row), audit);
      }
      await conn.query(`DELETE FROM report_lines WHERE id = ?`, [old.id]);
    }

    let sortOrder = 0;
    for (const line of lines) {
      const input: ReportLineInput = {
        weekId,
        areaId,
        subItemId: line.subItemId,
        workTargetEn: line.workTargetEn.trim() || line.workTargetCn.trim(),
        workTargetCn: line.workTargetCn.trim() || line.workTargetEn.trim(),
        weeklyCompletionRate: line.weeklyCompletionRate ?? null,
        summaryEn: line.summaryEn.trim() || line.summaryCn.trim(),
        summaryCn: line.summaryCn.trim() || line.summaryEn.trim(),
        planEn: line.planEn?.trim() || line.planCn?.trim() || null,
        planCn: line.planCn?.trim() || line.planEn?.trim() || null,
        sortOrder,
      };
      sortOrder += 1;

      if (line.id != null) {
        const before = await fetchLineRow(conn, line.id);
        if (before) {
          await insertRevision(conn, line.id, lineToSnapshot(before), audit);
        }
        await conn.query(
          `UPDATE report_lines SET
             sub_item_id = ?,
             work_target_en = ?,
             work_target_cn = ?,
             weekly_completion_rate = ?,
             summary_en = ?,
             summary_cn = ?,
             plan_en = ?,
             plan_cn = ?,
             sort_order = ?
           WHERE id = ?`,
          [
            input.subItemId,
            input.workTargetEn,
            input.workTargetCn,
            input.weeklyCompletionRate,
            input.summaryEn,
            input.summaryCn,
            input.planEn,
            input.planCn,
            input.sortOrder,
            line.id,
          ]
        );
      } else {
        await conn.query(
          `INSERT INTO report_lines (
             week_id, area_id, sub_item_id,
             work_target_en, work_target_cn, weekly_completion_rate,
             summary_en, summary_cn, plan_en, plan_cn, sort_order
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            weekId,
            areaId,
            input.subItemId,
            input.workTargetEn,
            input.workTargetCn,
            input.weeklyCompletionRate,
            input.summaryEn,
            input.summaryCn,
            input.planEn,
            input.planCn,
            input.sortOrder,
          ]
        );
      }
    }
  });

  return loadReportLines({ weekId, areaId });
}

export async function loadReportWeekBundle(
  year: number,
  weekNumber: number,
  areaId: number
): Promise<{
  weekId: number;
  lines: ReportLine[];
  submission: Awaited<ReturnType<typeof getSubmissionStatus>>;
}> {
  const weekId = await ensureReportWeek(year, weekNumber);
  const [lines, submission] = await Promise.all([
    loadReportLines({ weekId, areaId }),
    getSubmissionStatus(weekId, areaId),
  ]);
  return { weekId, lines, submission };
}
