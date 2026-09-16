import type { ModuleCardData } from "@/data/overview";
import { getDict } from "@/lib/i18n";
import type { Lang, ItsmAnalysisResult } from "@/lib/types";

const BAR_COLORS = ["#3b82f6", "#60a5fa", "#93c5fd"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function toDateKey(value: string): string {
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function mapItsmToOverview(
  base: ModuleCardData,
  result: ItsmAnalysisResult,
  lang: Lang
): ModuleCardData {
  const t = getDict(lang);
  const topGroups = [...result.byGroup].sort((a, b) => b.count - a.count).slice(0, 3);
  const maxBar = Math.max(1, ...topGroups.map((g) => g.count));

  const series = result.trend.current.map((item, index) => ({
    date: toDateKey(item.date),
    current: item.count,
    previous: result.trend.previous[index]?.count ?? 0,
  }));

  return {
    ...base,

    stats: [
      {
        label: t.dashboard.totalTicket,
        value: String(result.total),
        tone: "accent",
      },
      {
        label: t.dashboard.openTicket,
        value: String(result.openTickets),
        tone: "warning",
      },
      {
        label: t.dashboard.closedTicket,
        value: String(result.closedTickets),
        tone: "success",
      },
      {
        label: t.itsmAnalysis.activeUsers,
        value: String(result.activeUsers),
        tone: "accent",
      },
    ],

    bars: {
      title: t.dashboard.ticketByGroup,
      items: topGroups.map((g, index) => ({
        label:
          lang === "cn"
            ? g.name_cn?.trim() || g.name_en?.trim() || "Unknown"
            : g.name_en?.trim() || g.name_cn?.trim() || "Unknown",

        value: g.count,
        max: maxBar,
        color: BAR_COLORS[index % BAR_COLORS.length],
      })),
    },

    pics: {
      title: t.dashboard.topPicTicket,
      items: result.requesterRanking
        .filter((r) => r.name !== "NUSA IT Test001")
        .slice(0, 3)
        .map((r) => ({
          name: r.name,
          role: "Requester",
          count: r.count,
          initials: initials(r.name),
        })),
    },

    chart: {
      title: t.dashboard.ticketTrend,
      type: "trend",
      legend: [
        { label: t.dashboard.currentPeriod, color: "#25ebb3" },
        { label: t.dashboard.previousPeriod, color: "#C9D1DB" },
      ],
      series,
    },
  };
}
