import { mapReportLineRow } from "./apiHelpers";
import {
  isDivisionAreaCode,
  isProjectLine,
  isSafetyAreaCode,
  projectStatus,
} from "./lineClassification";
import type {
  ReportArea,
  ReportAttentionItem,
  ReportDailyWorkMetrics,
  ReportDivisionMetrics,
  ReportKpiSnapshot,
  ReportLine,
  ReportLineRow,
  ReportOverviewMetrics,
  ReportProjectMetrics,
  ReportSafetyMetrics,
  ReportTrendRow,
} from "./types";
import { parseCompletionRate, weekDateRange, weekLabel } from "./weekCalendar";

const TARGET_THRESHOLD = 90;

function avgRateFromFractions(values: (number | null | undefined)[]): number {
  const rates = values.filter((r): r is number => r != null && Number.isFinite(r));
  if (!rates.length) return 0;
  return Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 1000) / 10;
}

function kpiSnapshot(current: number, previous: number | null): ReportKpiSnapshot {
  const delta =
    previous != null && Number.isFinite(previous) ? Math.round((current - previous) * 10) / 10 : null;
  return { value: current, previousValue: previous, delta };
}

function lineStatus(rate: number | null | undefined): "completed" | "in_progress" | "not_started" {
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return "not_started";
  if (rate >= 1) return "completed";
  return "in_progress";
}

function recentLineNeedsAttention(line: ReportLine): boolean {
  const rate = line.weeklyCompletionRate;
  if (rate == null || !Number.isFinite(rate)) return true;
  return rate < 1;
}

function compareRecentLines(a: ReportLine, b: ReportLine): number {
  const aAttention = recentLineNeedsAttention(a) ? 0 : 1;
  const bAttention = recentLineNeedsAttention(b) ? 0 : 1;
  if (aAttention !== bAttention) return aAttention - bAttention;

  const aRate = a.weeklyCompletionRate ?? -1;
  const bRate = b.weeklyCompletionRate ?? -1;
  if (aRate !== bRate) return aRate - bRate;

  return a.sortOrder - b.sortOrder || b.id - a.id;
}

function countRecentLineStats(lines: ReportLine[]): { onTrack: number; needsAttention: number } {
  let onTrack = 0;
  let needsAttention = 0;
  for (const line of lines) {
    if (recentLineNeedsAttention(line)) needsAttention += 1;
    else onTrack += 1;
  }
  return { onTrack, needsAttention };
}

function weekStatus(achievement: number): "on_target" | "below_target" | "above_target" {
  if (achievement >= TARGET_THRESHOLD) return achievement >= 100 ? "above_target" : "on_target";
  return "below_target";
}

function filterWeekRows(rows: ReportLineRow[], year: number, weekNumber: number): ReportLineRow[] {
  return rows.filter(
    (row) => Number(row.year ?? 0) === year && Number(row.week_number ?? 0) === weekNumber
  );
}

function computeDailyWorkMetrics(lines: ReportLine[]): ReportDailyWorkMetrics {
  const dailyLines = lines.filter((line) => !isProjectLine(line));
  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;

  for (const line of dailyLines) {
    const status = lineStatus(line.weeklyCompletionRate);
    if (status === "completed") completed += 1;
    else if (status === "in_progress") inProgress += 1;
    else notStarted += 1;
  }

  const rates = dailyLines
    .map((line) => line.weeklyCompletionRate)
    .filter((rate): rate is number => rate != null && Number.isFinite(rate));

  return {
    planned: dailyLines.length,
    completed,
    inProgress,
    notStarted,
    completionRate: avgRateFromFractions(rates),
  };
}

function computeProjectMetrics(lines: ReportLine[]): ReportProjectMetrics {
  const projectLines = lines.filter((line) => isProjectLine(line));
  const items = projectLines.map((line) => {
    const rate = line.weeklyCompletionRate ?? 0;
    return {
      id: line.id,
      areaCode: "",
      nameEn: line.workTargetEn.trim() || line.subItemNameEn || "—",
      nameCn: line.workTargetCn.trim() || line.subItemNameCn || "—",
      progressRate: Math.round(rate * 1000) / 10,
      status: projectStatus(line.weeklyCompletionRate),
    };
  });

  let onTrack = 0;
  let atRisk = 0;
  let delayed = 0;
  for (const item of items) {
    if (item.status === "on_track") onTrack += 1;
    else if (item.status === "at_risk") atRisk += 1;
    else delayed += 1;
  }

  const rates = projectLines
    .map((line) => line.weeklyCompletionRate)
    .filter((rate): rate is number => rate != null && Number.isFinite(rate));

  return {
    activeCount: projectLines.length,
    onTrack,
    atRisk,
    delayed,
    overallProgress: rates.length ? avgRateFromFractions(rates) : null,
    items,
  };
}

function computeOnTimeRate(
  submissions: { weekId: number; areaId: number; status: "draft" | "submitted"; submittedAt: string | null }[],
  weekId: number | null,
  reportDueOn: string,
  areaIds: number[]
): number {
  if (!weekId || !areaIds.length) return 0;

  const due = new Date(`${reportDueOn}T23:59:59`);
  let onTime = 0;
  let submitted = 0;

  for (const areaId of areaIds) {
    const sub = submissions.find((s) => s.weekId === weekId && s.areaId === areaId);
    if (!sub || sub.status !== "submitted") continue;
    submitted += 1;
    if (sub.submittedAt) {
      const at = new Date(sub.submittedAt);
      if (at <= due) onTime += 1;
    } else {
      onTime += 1;
    }
  }

  if (!submitted) return 0;
  return Math.round((onTime / submitted) * 1000) / 10;
}

function computeReportCompletionRate(
  submissions: { weekId: number; areaId: number; status: "draft" | "submitted" }[],
  weekId: number | null,
  areaIds: number[]
): number {
  if (!weekId || !areaIds.length) return 0;
  const submitted = areaIds.filter((areaId) => {
    const sub = submissions.find((s) => s.weekId === weekId && s.areaId === areaId);
    return sub?.status === "submitted";
  }).length;
  return Math.round((submitted / areaIds.length) * 1000) / 10;
}

function computeWeekAchievement(lines: ReportLine[]): number {
  const rates = lines
    .map((line) => line.weeklyCompletionRate)
    .filter((rate): rate is number => rate != null && Number.isFinite(rate));
  return avgRateFromFractions(rates);
}

function buildAttentionItems(input: {
  year: number;
  weekNumber: number;
  areas: ReportArea[];
  lines: ReportLine[];
  divisions: ReportDivisionMetrics[];
  safety: ReportSafetyMetrics;
  dailyWork: ReportDailyWorkMetrics;
  projects: ReportProjectMetrics;
  achievement: number;
}): ReportAttentionItem[] {
  const items: ReportAttentionItem[] = [];

  if (input.lines.length > 0 && input.achievement < TARGET_THRESHOLD) {
    items.push({
      severity: "warning",
      messageEn: `Overall achievement below target — ${input.achievement}%`,
      messageCn: `整体完成度低于目标 — ${input.achievement}%`,
    });
  }

  for (const division of input.divisions) {
    if (division.submissionStatus === "draft") {
      items.push({
        severity: "warning",
        messageEn: `${division.nameEn} report not submitted for Week ${input.weekNumber}`,
        messageCn: `${division.nameCn} 第${input.weekNumber}周周报尚未提交`,
      });
    }
    if (division.workCompletionRate < TARGET_THRESHOLD && division.lineCount > 0) {
      items.push({
        severity: "warning",
        messageEn: `${division.nameEn} work completion below target — ${division.workCompletionRate}%`,
        messageCn: `${division.nameCn} 工作完成度低于目标 — ${division.workCompletionRate}%`,
      });
    }
  }

  if (input.safety.submissionStatus === "draft") {
    items.push({
      severity: "info",
      messageEn: "Safety weekly report not submitted",
      messageCn: "安全周报尚未提交",
    });
  }

  if (input.dailyWork.notStarted > 0) {
    items.push({
      severity: "info",
      messageEn: `${input.dailyWork.notStarted} daily work item(s) not started`,
      messageCn: `${input.dailyWork.notStarted} 项日常工作尚未开始`,
    });
  }

  if (input.projects.atRisk > 0) {
    items.push({
      severity: "warning",
      messageEn: `${input.projects.atRisk} project(s) at risk`,
      messageCn: `${input.projects.atRisk} 个项目存在风险`,
    });
  }

  if (input.projects.delayed > 0) {
    items.push({
      severity: "critical",
      messageEn: `${input.projects.delayed} project(s) delayed`,
      messageCn: `${input.projects.delayed} 个项目进度滞后`,
    });
  }

  return items.slice(0, 8);
}

export function computeReportOverviewMetrics(input: {
  year: number;
  weekNumber: number;
  areas: ReportArea[];
  rows: ReportLineRow[];
  submissions: {
    weekId: number;
    areaId: number;
    status: "draft" | "submitted";
    submittedAt?: string | null;
  }[];
  weekId?: number | null;
}): ReportOverviewMetrics {
  const { year, weekNumber } = input;
  const range = weekDateRange(year, weekNumber);
  const weekRows = filterWeekRows(input.rows, year, weekNumber);
  const lines = weekRows.map(mapReportLineRow);

  const divisionAreas = input.areas.filter((area) => isDivisionAreaCode(area.code));
  const safetyArea = input.areas.find((area) => isSafetyAreaCode(area.code));
  const allAreaIds = input.areas.map((area) => area.id);

  const weekId =
    input.weekId ??
    (weekRows[0] ? Number(weekRows[0].week_id) : null) ??
    null;

  const prevWeekNumber = weekNumber > 1 ? weekNumber - 1 : null;
  const prevRows = prevWeekNumber != null ? filterWeekRows(input.rows, year, prevWeekNumber) : [];
  const prevLines = prevRows.map(mapReportLineRow);

  const achievement = computeWeekAchievement(lines);
  const prevAchievement = prevLines.length ? computeWeekAchievement(prevLines) : null;

  const dailyWork = computeDailyWorkMetrics(lines);
  const prevDailyWork = prevLines.length ? computeDailyWorkMetrics(prevLines) : null;

  const projects = computeProjectMetrics(lines);
  const prevProjects = prevLines.length ? computeProjectMetrics(prevLines) : null;
  projects.items = projects.items.map((item) => {
    const line = lines.find((entry) => entry.id === item.id);
    const area = input.areas.find((entry) => entry.id === line?.areaId);
    return { ...item, areaCode: area?.code ?? "" };
  });

  const onTimeRate = computeOnTimeRate(
    input.submissions.map((s) => ({
      weekId: s.weekId,
      areaId: s.areaId,
      status: s.status,
      submittedAt: s.submittedAt ?? null,
    })),
    weekId,
    range.reportDueOn,
    allAreaIds
  );

  const prevWeekId = prevRows[0] ? Number(prevRows[0].week_id) : null;
  const prevOnTimeRate =
    prevWeekId != null
      ? computeOnTimeRate(
          input.submissions.map((s) => ({
            weekId: s.weekId,
            areaId: s.areaId,
            status: s.status,
            submittedAt: s.submittedAt ?? null,
          })),
          prevWeekId,
          weekDateRange(year, prevWeekNumber ?? weekNumber).reportDueOn,
          allAreaIds
        )
      : null;

  const reportCompletion = computeReportCompletionRate(input.submissions, weekId, allAreaIds);
  const prevReportCompletion =
    prevWeekId != null
      ? computeReportCompletionRate(input.submissions, prevWeekId, allAreaIds)
      : null;

  const divisions: ReportDivisionMetrics[] = divisionAreas.map((area) => {
    const areaLines = lines.filter((line) => line.areaId === area.id);
    const dailyLines = areaLines.filter((line) => !isProjectLine(line));
    const projectLines = areaLines.filter((line) => isProjectLine(line));

    const dailyRates = dailyLines
      .map((line) => line.weeklyCompletionRate)
      .filter((rate): rate is number => rate != null && Number.isFinite(rate));
    const projectRates = projectLines
      .map((line) => line.weeklyCompletionRate)
      .filter((rate): rate is number => rate != null && Number.isFinite(rate));

    const submission = weekId
      ? input.submissions.find((s) => s.weekId === weekId && s.areaId === area.id)
      : undefined;

    return {
      areaId: area.id,
      code: area.code,
      nameEn: area.nameEn,
      nameCn: area.nameCn,
      workCompletionRate: avgRateFromFractions(dailyRates),
      projectProgressRate: projectRates.length ? avgRateFromFractions(projectRates) : null,
      lineCount: areaLines.length,
      submissionStatus: submission?.status ?? null,
    };
  });

  const safetyLines = safetyArea ? lines.filter((line) => line.areaId === safetyArea.id) : [];
  const safetyRates = safetyLines
    .map((line) => line.weeklyCompletionRate)
    .filter((rate): rate is number => rate != null && Number.isFinite(rate));
  const safetySubmission = weekId && safetyArea
    ? input.submissions.find((s) => s.weekId === weekId && s.areaId === safetyArea.id)
    : undefined;

  const safety: ReportSafetyMetrics = {
    lineCount: safetyLines.length,
    avgCompletionRate: avgRateFromFractions(safetyRates),
    submissionStatus: safetySubmission?.status ?? null,
    openFindings: safetyLines.filter((line) => lineStatus(line.weeklyCompletionRate) !== "completed").length,
  };

  const byArea = input.areas.map((area) => {
    const areaRows = input.rows.filter((row) => Number(row.area_id) === area.id);
    const areaLines = areaRows.map(mapReportLineRow);
    const areaWeekLines = areaLines.filter(
      (line) => line.year === year && line.weekNumber === weekNumber
    );
    const areaRates = areaWeekLines
      .map((line) => line.weeklyCompletionRate)
      .filter((rate): rate is number => rate != null && Number.isFinite(rate));

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
      lineCount: areaWeekLines.length,
      avgCompletionRate: avgRateFromFractions(areaRates),
      submittedWeeks,
    };
  });

  const trendMap = new Map<
    string,
    { year: number; weekNumber: number; workRates: number[]; projectRates: number[]; count: number }
  >();

  for (const row of input.rows) {
    const rowYear = Number(row.year ?? input.year);
    const rowWeek = Number(row.week_number ?? 0);
    if (!rowWeek) continue;
    const key = `${rowYear}-${rowWeek}`;
    const rate = parseCompletionRate(row.weekly_completion_rate);
    const entry = trendMap.get(key) ?? {
      year: rowYear,
      weekNumber: rowWeek,
      workRates: [],
      projectRates: [],
      count: 0,
    };
    entry.count += 1;
    if (rate != null) {
      if (isProjectLine(mapReportLineRow(row))) entry.projectRates.push(rate);
      else entry.workRates.push(rate);
    }
    trendMap.set(key, entry);
  }

  const weeklyTrend: ReportTrendRow[] = [...trendMap.values()]
    .filter((entry) => entry.year === year)
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .slice(-12)
    .map((entry) => {
      const workCompletionRate = avgRateFromFractions(entry.workRates);
      const projectProgressRate = entry.projectRates.length
        ? avgRateFromFractions(entry.projectRates)
        : null;
      const avgRateValue = avgRateFromFractions([...entry.workRates, ...entry.projectRates]);
      return {
        label: `W${entry.weekNumber}`,
        year: entry.year,
        weekNumber: entry.weekNumber,
        avgRate: avgRateValue,
        workCompletionRate,
        projectProgressRate,
        lineCount: entry.count,
      };
    });

  const weekSubmissions = weekId
    ? input.submissions.filter((s) => s.weekId === weekId)
    : [];
  const submittedCount = weekSubmissions.filter((s) => s.status === "submitted").length;
  const draftCount = weekSubmissions.filter((s) => s.status === "draft").length;

  const prevLineCount = prevLines.length;
  const lineDelta =
    prevWeekNumber != null ? Math.round((lines.length - prevLineCount) * 10) / 10 : null;

  const recentLineStats = countRecentLineStats(lines);
  const recentLines: ReportLine[] = [...lines].sort(compareRecentLines).slice(0, 8);

  const attention = buildAttentionItems({
    year,
    weekNumber,
    areas: input.areas,
    lines,
    divisions,
    safety,
    dailyWork,
    projects,
    achievement,
  });

  const projectProgressSnapshot =
    projects.overallProgress != null
      ? kpiSnapshot(
          projects.overallProgress,
          prevProjects?.overallProgress ?? null
        )
      : null;

  return {
    year,
    weekNumber,
    weekLabel: weekLabel(weekNumber, "en"),
    weekStartsOn: range.startsOn,
    weekEndsOn: range.endsOn,
    achievement: kpiSnapshot(achievement, prevAchievement),
    workCompletion: kpiSnapshot(dailyWork.completionRate, prevDailyWork?.completionRate ?? null),
    projectProgress: projectProgressSnapshot,
    onTimeRate: kpiSnapshot(onTimeRate, prevOnTimeRate),
    reportCompletion: kpiSnapshot(reportCompletion, prevReportCompletion),
    reportLineCount: {
      value: lines.length,
      previousValue: prevWeekNumber != null ? prevLineCount : null,
      delta: lineDelta,
    },
    currentWeekStatus: weekStatus(achievement),
    totalLines: lines.length,
    totalWeeks: new Set(input.rows.map((row) => `${row.year}-${row.week_number}`)).size,
    avgCompletionRate: achievement,
    submittedCount,
    draftCount,
    byArea,
    weeklyTrend,
    divisions,
    dailyWork,
    projects,
    safety,
    attention,
    recentLines,
    recentLineStats,
  };
}
