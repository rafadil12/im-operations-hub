import type { ModuleCardData } from "@/data/overview";
import { localizedName } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { areaColor, reportEnText } from "./copy";
import { monthLabel } from "./weekCalendar";
import type { ReportKpiSnapshot, ReportOverviewMetrics } from "./types";

function formatDelta(delta: number | null): string | undefined {
  if (delta == null) return undefined;
  if (delta === 0) return "— 0%";
  const positive = delta > 0;
  return `${positive ? "↑" : "↓"} ${Math.abs(delta)}%`;
}

function kpiStat(
  snapshot: ReportKpiSnapshot,
  tone: "default" | "success" | "warning" | "accent",
  label: string,
  suffix = "%"
) {
  return {
    label,
    value: `${snapshot.value}${suffix}`,
    trend: formatDelta(snapshot.delta),
    tone,
  };
}

export function mapReportToOverview(
  module: ModuleCardData,
  metrics: ReportOverviewMetrics,
  lang: Lang = "en"
): ModuleCardData {
  const areaLabel = (nameEn: string, nameCn: string) =>
    localizedName({ name_en: nameEn, name_cn: nameCn }, lang);

  const projectProgress = metrics.projectProgress;

  return {
    ...module,
    href: "/report",
    stats: [
      kpiStat(
        metrics.achievement,
        metrics.achievement.value >= 90 ? "success" : "warning",
        reportEnText("achievement")
      ),
      kpiStat(metrics.workCompletion, "accent", reportEnText("workCompletion")),
      projectProgress
        ? kpiStat(
            projectProgress,
            projectProgress.value >= 90 ? "success" : "warning",
            reportEnText("projectProgress")
          )
        : {
            label: reportEnText("projectProgress"),
            value: "—",
            tone: "warning" as const,
          },
      kpiStat(
        metrics.reportCompletion,
        metrics.reportCompletion.value >= 100 ? "success" : "warning",
        reportEnText("reportCompletion")
      ),
    ],
    trendBars: {
      title: reportEnText("workTrend"),
      items: [],
    },
    reportWeeklyTrend: metrics.weeklyTrend,
    reportCurrentMonth: {
      monthLabel: monthLabel(metrics.currentMonth.year, metrics.currentMonth.month, lang),
      status: metrics.currentMonth.status,
      achievement: metrics.currentMonth.achievement,
      submittedCount: metrics.currentMonth.submittedCount,
      draftCount: metrics.currentMonth.draftCount,
      areaCount: metrics.byArea.length,
      totalLines: metrics.currentMonth.totalLines,
      byArea: metrics.currentMonth.byArea.map((a) => ({
        label: areaLabel(a.nameEn, a.nameCn),
        value: a.avgCompletionRate,
        color: areaColor(a.code),
      })),
    },
  };
}
