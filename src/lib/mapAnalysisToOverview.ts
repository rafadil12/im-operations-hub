import type { ModuleCardData } from "@/data/overview-mock";
import { namedStatusCount, type AnalysisResult } from "@/lib/types";
import type { Lang } from "@/lib/types";

const BAR_COLORS = ["#22c55e", "#4ade80", "#86efac", "#bbf7d0"];
const STATUS_COLORS = {
  completed: "#22c55e",
  inProgress: "#3b82f6",
  pending: "#f59e0b",
} as const;

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function pctLabel(part: number, total: number): string {
  return `${pct(part, total)}%`;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/**
 * Maps Analysis API result into the daily-operation overview card shape.
 * Keeps static shell fields from `base` (id, title, href, etc.).
 */
export function mapAnalysisToOverview(
  base: ModuleCardData,
  result: AnalysisResult,
  lang: Lang,
): ModuleCardData {
  const total = result.total;
  const completed = namedStatusCount(result.byStatus, "Completed");

  const completedPct = pct(completed, total);
  const inProgressPct = pct(
    namedStatusCount(result.byStatus, "In Progress"),
    total,
  );
  const pendingPct = pct(namedStatusCount(result.byStatus, "Pending"), total);

  const divisions = result.byDivision.slice(0, 3);
  const maxBar = Math.max(1, ...divisions.map((d) => d.count));

  const pics = result.userRanking.slice(0, 3).map((u) => {
    const name =
     lang === "cn"
      ? u.name_cn?.trim() || u.name_en?.trim() || "Unknown"
      : u.name_en?.trim() || u.name_cn?.trim() || "Unknown";
    return {
      name,
      role: u.division?.trim() || "—",
      count: u.count,
      initials: initialsFromName(name),
    };
  });

  return {
    ...base,
    stats: [
      { label: "Total Task", value: String(total), tone: "accent" },
      {
        label: "Completed",
        value: String(completed),
        trend: pctLabel(completed, total),
        tone: "success",
      },
      {
        label: "Total Users",
        value: String(result.totalUsers),
        tone: "accent",
      },
      {
        label: "Avg. Tasks",
        value: String(Math.round(result.avgTasks)),
        tone: "warning",
      },
    ],
    bars: {
      title: "Task by Department (This Month)",
      items: divisions.map((d, i) => ({
        label: 
          lang === "cn"
            ? d.name_cn?.trim() || d.name_en?.trim() || "Unknown"
            : d.name_en?.trim() || d.name_cn?.trim() || "Unknown",
        value: d.count,
        max: maxBar,
        color: BAR_COLORS[i % BAR_COLORS.length],
      })),
    },
    pics: {
      title: "Top PIC (by Most Task)",
      items: pics,
    },
    chart: {
      title: "Task Status (This Month)",
      type: "donut",
      legend: [
        { label: "Completed", color: STATUS_COLORS.completed },
        { label: "In Progress", color: STATUS_COLORS.inProgress },
        { label: "Pending", color: STATUS_COLORS.pending },
      ],
      segments: [completedPct, inProgressPct, pendingPct],
      centerValue: `${Math.round(completedPct)}%`,
      centerLabel: "Done",
    },
  };
}
