import type { ModuleCardData } from "@/data/overview";
import { areaColor } from "./copy";
import type { ReportOverviewMetrics } from "./types";

export function mapReportToOverview(
  module: ModuleCardData,
  metrics: ReportOverviewMetrics
): ModuleCardData {
  const maxTrend = Math.max(...metrics.weeklyTrend.map((t) => t.avgRate), 1);

  return {
    ...module,
    href: "/report",
    stats: [
      { label: "Report Lines", value: String(metrics.totalLines), tone: "accent" },
      { label: "Avg Completion", value: `${metrics.avgCompletionRate}%`, tone: "accent" },
      { label: "Submitted", value: String(metrics.submittedCount), tone: "success" },
      { label: "Draft", value: String(metrics.draftCount), tone: "warning" },
    ],
    trendBars: {
      title: "Weekly Completion",
      items: metrics.weeklyTrend.map((row) => ({
        label: row.label,
        value: row.avgRate,
        max: maxTrend,
        color: "#eab308",
      })),
    },
    chart: {
      title: "By Area",
      type: "donut",
      legend: metrics.byArea.map((a) => ({
        label: a.nameEn,
        color: areaColor(a.code),
      })),
      segments: metrics.byArea.map((a) => a.lineCount),
      centerValue: String(metrics.totalLines),
      centerLabel: "Lines",
    },
    progressRings: metrics.byArea.map((a) => ({
      label: a.code,
      value: a.avgCompletionRate,
      color: areaColor(a.code),
    })),
  };
}
