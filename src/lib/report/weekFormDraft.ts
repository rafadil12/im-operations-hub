import type { ReportLine } from "./types";

export type ReportWeekLineDraft = {
  key: string;
  id?: number;
  subItemId: number | "";
  targetEn: string;
  targetCn: string;
  completionPct: number;
  summaryEn: string;
  summaryCn: string;
  planEn: string;
  planCn: string;
};

export const MAX_WEEK_REPORT_LINES = 20;

export function newWeekLineDraft(): ReportWeekLineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    subItemId: "",
    targetEn: "",
    targetCn: "",
    completionPct: 100,
    summaryEn: "",
    summaryCn: "",
    planEn: "",
    planCn: "",
  };
}

export function lineToDraft(row: ReportLine): ReportWeekLineDraft {
  return {
    key: `line-${row.id}`,
    id: row.id,
    subItemId: row.subItemId ?? "",
    targetEn: row.workTargetEn,
    targetCn: row.workTargetCn,
    completionPct:
      row.weeklyCompletionRate != null ? Math.round(row.weeklyCompletionRate * 100) : 100,
    summaryEn: row.summaryEn,
    summaryCn: row.summaryCn,
    planEn: row.planEn ?? "",
    planCn: row.planCn ?? "",
  };
}

export function draftToPayload(line: ReportWeekLineDraft) {
  const targetEn = line.targetEn.trim();
  const targetCn = line.targetCn.trim();
  const summaryEn = line.summaryEn.trim();
  const summaryCn = line.summaryCn.trim();
  const planEn = line.planEn.trim();
  const planCn = line.planCn.trim();
  const rate = Math.min(100, Math.max(0, line.completionPct)) / 100;

  return {
    id: line.id,
    subItemId: Number(line.subItemId),
    workTargetEn: targetEn,
    workTargetCn: targetCn,
    weeklyCompletionRate: rate,
    summaryEn,
    summaryCn,
    planEn: planEn || null,
    planCn: planCn || null,
  };
}

export function usedSubItemIds(lines: ReportWeekLineDraft[], excludeKey?: string): Set<number> {
  const ids = new Set<number>();
  for (const line of lines) {
    if (line.key === excludeKey) continue;
    if (line.subItemId !== "") ids.add(Number(line.subItemId));
  }
  return ids;
}
