import { NextResponse } from "next/server";
import type { ReportLine, ReportLineRow } from "./types";
import { parseCompletionRate } from "./weekCalendar";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function mapReportLineRow(row: ReportLineRow): ReportLine {
  return {
    id: Number(row.id),
    weekId: Number(row.week_id),
    areaId: Number(row.area_id),
    subItemId: row.sub_item_id != null ? Number(row.sub_item_id) : null,
    subItemNameEn: row.sub_item_name_en,
    subItemNameCn: row.sub_item_name_cn,
    workTargetEn: row.work_target_en,
    workTargetCn: row.work_target_cn,
    weeklyCompletionRate: parseCompletionRate(row.weekly_completion_rate),
    summaryEn: row.summary_en,
    summaryCn: row.summary_cn,
    planEn: row.plan_en,
    planCn: row.plan_cn,
    sortOrder: Number(row.sort_order ?? 0),
    year: row.year != null ? Number(row.year) : undefined,
    weekNumber: row.week_number != null ? Number(row.week_number) : undefined,
    submissionStatus: row.submission_status ?? null,
  };
}

export function hasTextPair(en: string, cn: string): boolean {
  return Boolean(en.trim() || cn.trim());
}

export function parsePositiveInt(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const num = Number(raw);
  return Number.isInteger(num) && num > 0 ? num : null;
}

export function parseYear(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const num = Number(raw);
  return Number.isInteger(num) && num >= 2000 && num <= 2100 ? num : null;
}

export function parseWeekNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const num = Number(raw);
  return Number.isInteger(num) && num >= 1 && num <= 53 ? num : null;
}
