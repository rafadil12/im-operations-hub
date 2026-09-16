import type { ModuleCardData } from "@/data/overview";
import { getDict } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { divisionColor } from "@/lib/training/copy";
import type { TrainingOverviewMetrics } from "@/lib/training/types";

export function mapTrainingToOverview(
  module: ModuleCardData,
  metrics: TrainingOverviewMetrics,
  lang: Lang = "en"
): ModuleCardData {
  const t = getDict(lang);
  const byDivision = metrics.byDivision;
  const total = byDivision.reduce((sum, row) => sum + row.sessions, 0);
  const pct = (value: number) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0);

  return {
    ...module,
    href: "/training",
    stats: [
      { label: t.dashboard.totalTraining, value: String(metrics.totalSessions), tone: "accent" },
      { label: t.dashboard.participants, value: String(metrics.totalParticipants), tone: "accent" },
      { label: t.dashboard.uniqueParticipants, value: String(metrics.uniqueParticipants), tone: "success" },
      {
        label: t.dashboard.totalTopics,
        value: String(metrics.totalTopics),
        tone: "accent",
      },
    ],
    chart: {
      title: t.dashboard.trainingTrend,
      type: "trend",
      legend: [
        { label: t.dashboard.sessions, color: "#6366f1" },
        { label: t.dashboard.participants, color: "#22c55e" },
      ],
      series: metrics.monthlyTrend.map((row) => ({
        date: row.period.length === 7 ? `${row.period}-01` : row.period,
        current: row.sessions,
        previous: row.participants,
      })),
    },
    secondaryChart: {
      title: t.dashboard.trainingByCategory,
      type: "donut",
      legend: byDivision.map((row) => ({
        label:
          lang === "cn"
            ? row.nameCn || row.nameEn || `Division ${row.divisionId}`
            : row.nameEn || row.nameCn || `Division ${row.divisionId}`,
        color: divisionColor(row.nameEn),
      })),
      segments: byDivision.map((row) => pct(row.sessions)),
      centerValue: String(metrics.totalSessions),
      centerLabel: t.dashboard.sessions,
    },
    recentRows: metrics.recentSessions.slice(0, 4).map((row) => ({
      name: lang === "cn" ? row.topicCn || row.topicEn : row.topicEn || row.topicCn,
      date: row.sessionDate,
      participants: row.participantCount,
      completion: row.attachment ? t.dashboard.attachment : "—",
      avgScore:
        lang === "cn"
          ? row.divisionNameCn || row.divisionNameEn || "—"
          : row.divisionNameEn || row.divisionNameCn || "—",
    })),
    trainingByDivision: metrics.byDivision,
  };
}
