import type { ModuleCardData } from "@/data/overview";
import { divisionColor } from "@/lib/training/copy";
import type { TrainingOverviewMetrics } from "@/lib/training/types";

export function mapTrainingToOverview(
  module: ModuleCardData,
  metrics: TrainingOverviewMetrics
): ModuleCardData {
  const byDivision = metrics.byDivision;
  const total = byDivision.reduce((sum, row) => sum + row.sessions, 0);
  const pct = (value: number) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0);

  return {
    ...module,
    href: "/training",
    stats: [
      { label: "Total Training", value: String(metrics.totalSessions), tone: "accent" },
      { label: "Participants", value: String(metrics.totalParticipants), tone: "accent" },
      { label: "Unique Participants", value: String(metrics.uniqueParticipants), tone: "success" },
      {
        label: "Total Topics",
        value: String(metrics.totalTopics),
        tone: "accent",
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
        date: row.period.length === 7 ? `${row.period}-01` : row.period,
        current: row.sessions,
        previous: row.participants,
      })),
    },
    secondaryChart: {
      title: "Training by Divisions",
      type: "donut",
      legend: byDivision.map((row) => ({
        label: row.nameEn || row.nameCn || `Division ${row.divisionId}`,
        color: divisionColor(row.nameEn),
      })),
      segments: byDivision.map((row) => pct(row.sessions)),
      centerValue: String(metrics.totalSessions),
      centerLabel: "Sessions",
    },
    recentRows: metrics.recentSessions.slice(0, 4).map((row) => ({
      name: row.topicEn || row.topicCn,
      date: row.sessionDate,
      participants: row.participantCount,
      completion: row.attachment ? "File" : "—",
      avgScore: row.divisionNameEn || row.divisionNameCn || "—",
    })),
    trainingByDivision: metrics.byDivision,
  };
}
