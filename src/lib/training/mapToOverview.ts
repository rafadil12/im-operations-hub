import type { ModuleCardData } from "@/data/overview";
import { CATEGORY_COLORS } from "@/lib/training/copy";
import type { TrainingOverviewMetrics } from "@/lib/training/types";

export function mapTrainingToOverview(
  module: ModuleCardData,
  metrics: TrainingOverviewMetrics
): ModuleCardData {
  const mes = metrics.byCategory.find((c) => c.category === "mes")?.sessions ?? 0;
  const intelligent = metrics.byCategory.find((c) => c.category === "intelligent")?.sessions ?? 0;
  const it = metrics.byCategory.find((c) => c.category === "it")?.sessions ?? 0;
  const maxCat = Math.max(mes, intelligent, it, 1);

  return {
    ...module,
    href: "/training",
    stats: [
      { label: "Total Training", value: String(metrics.totalSessions), tone: "accent" },
      { label: "Participants", value: String(metrics.totalParticipants), tone: "accent" },
      { label: "Unique Participants", value: String(metrics.uniqueParticipants), tone: "success" },
      {
        label: "Attachment Rate",
        value: `${metrics.attachmentRate}%`,
        tone: metrics.attachmentRate >= 80 ? "success" : "warning",
      },
    ],
    chart: {
      title: "Training Trend",
      type: "trend",
      legend: [
        { label: "Sessions", color: "#6366f1" },
        { label: "Participants", color: "#22c55e" },
      ],
      series: metrics.monthlyTrend.map((row) => ({
        date: `${row.month}-01`,
        current: row.sessions,
        previous: row.participants,
      })),
    },
    secondaryChart: {
      title: "Training by Category",
      type: "donut",
      legend: [
        { label: "MES", color: CATEGORY_COLORS.mes },
        { label: "Intelligent", color: CATEGORY_COLORS.intelligent },
        { label: "IT", color: CATEGORY_COLORS.it },
      ],
      segments: [mes / maxCat, intelligent / maxCat, it / maxCat],
      centerValue: String(metrics.totalSessions),
      centerLabel: "Sessions",
    },
    recentRows: metrics.recentSessions.slice(0, 4).map((row) => ({
      name: row.topic,
      date: row.sessionDate,
      participants: row.participantCount,
      completion: row.attachment ? "File" : "—",
      avgScore: row.category.toUpperCase(),
    })),
  };
}
