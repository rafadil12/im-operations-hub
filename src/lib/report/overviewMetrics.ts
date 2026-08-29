import { mapReportLineRow } from "./apiHelpers";
import type {
  ReportAreaMetrics,
  ReportLine,
  ReportLineRow,
  ReportOverviewMetrics,
  ReportTrendRow,
} from "./types";
import { parseCompletionRate } from "./weekCalendar";
import type { ReportArea } from "./types";

function avgRate(values: number[]): number {
  if (!values.length) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 1000) / 10;
}

export function computeReportOverviewMetrics(input: {
  year: number;
  areas: ReportArea[];
  rows: ReportLineRow[];
  submissions: { weekId: number; areaId: number; status: "draft" | "submitted" }[];
}): ReportOverviewMetrics {
  const lines = input.rows.map(mapReportLineRow);

  const rates = lines
    .map((l) => l.weeklyCompletionRate)
    .filter((r): r is number => r != null && Number.isFinite(r));

  const weekKeys = new Set(lines.map((l) => `${input.rows.find((r) => Number(r.id) === l.id)?.week_number}`));

  const byArea: ReportAreaMetrics[] = input.areas.map((area) => {
    const areaRows = input.rows.filter((r) => Number(r.area_id) === area.id);
    const areaLines = areaRows.map(mapReportLineRow);
    const areaRates = areaLines
      .map((l) => l.weeklyCompletionRate)
      .filter((r): r is number => r != null && Number.isFinite(r));

    const submittedWeeks = new Set(
      input.submissions
        .filter((s) => s.areaId === area.id && s.status === "submitted")
        .map((s) => s.weekId)
    ).size;

    return {
      areaId: area.id,
      code: area.code,
      nameEn: area.nameEn,
      nameCn: area.nameCn,
      lineCount: areaLines.length,
      avgCompletionRate: avgRate(areaRates),
      submittedWeeks,
    };
  });

  const trendMap = new Map<string, { year: number; weekNumber: number; rates: number[]; count: number }>();
  for (const row of input.rows) {
    const year = Number(row.year ?? input.year);
    const weekNumber = Number(row.week_number ?? 0);
    const key = `${year}-${weekNumber}`;
    const rate = parseCompletionRate(row.weekly_completion_rate);
    const entry = trendMap.get(key) ?? { year, weekNumber, rates: [], count: 0 };
    entry.count += 1;
    if (rate != null) entry.rates.push(rate);
    trendMap.set(key, entry);
  }

  const weeklyTrend: ReportTrendRow[] = [...trendMap.values()]
    .sort((a, b) => a.year - b.year || a.weekNumber - b.weekNumber)
    .slice(-12)
    .map((entry) => ({
      label: `W${entry.weekNumber}`,
      year: entry.year,
      weekNumber: entry.weekNumber,
      avgRate: avgRate(entry.rates),
      lineCount: entry.count,
    }));

  const submittedCount = input.submissions.filter((s) => s.status === "submitted").length;
  const draftCount = input.submissions.filter((s) => s.status === "draft").length;

  const recentLines: ReportLine[] = [...lines]
    .sort((a, b) => b.id - a.id)
    .slice(0, 8);

  return {
    year: input.year,
    totalLines: lines.length,
    totalWeeks: weekKeys.size,
    avgCompletionRate: avgRate(rates),
    submittedCount,
    draftCount,
    byArea,
    weeklyTrend,
    recentLines,
  };
}
