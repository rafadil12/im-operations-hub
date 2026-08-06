import type { ModuleCardData } from "@/data/overview-mock";
import type { Lang, ItsmAnalysisResult } from "@/lib/types";

const BAR_COLORS = ["#22c55e", "#4ade80", "#86efac", "#bbf7d0"];

const STATUS_COLORS = {
  closed: "#22c55e",
  open: "#3b82f6",
  pending: "#f59e0b",
} as const;

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function mapItsmToOverview(
  base: ModuleCardData,
  result: ItsmAnalysisResult,
  lang: Lang,
): ModuleCardData {
  const maxBar = Math.max(
    1,
    ...result.byGroup.map((g) => g.count),
  );

  const closedPct = pct(result.closedTickets, result.total);
  const openPct = pct(result.openTickets, result.total);

  const pendingCount =
    result.byStatus.find((x) =>
      (x.name_en ?? "").toLowerCase().includes("pending"),
    )?.count ?? 0;

  const pendingPct = pct(pendingCount, result.total);

  return {
    ...base,

    stats: [
      {
        label: "Total Tickets",
        value: String(result.total),
        tone: "accent",
      },
      {
        label: "Open Tickets",
        value: String(result.openTickets),
        tone: "warning",
      },
      {
        label: "Closed Tickets",
        value: String(result.closedTickets),
        tone: "success",
      },
      {
        label: "Active Users",
        value: String(result.activeUsers),
        tone: "accent",
      },
    ],

    bars: {
      title: "Ticket by Department",
      items: result.byGroup.map((g, index) => ({
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
        title: "Top PIC",
        items: result.requesterRanking
            .filter((r) => r.name !== "NUSA IT Test001")
            .slice(0, 4)
            .map((r) => ({
            name: r.name,
            role: "Requester",
            count: r.count,
            initials: initials(r.name),
            })),
        },

    chart: {
      title: "Ticket Status",
      type: "donut",

      legend: [
        {
          label: "Closed",
          color: STATUS_COLORS.closed,
        },
        {
          label: "Open",
          color: STATUS_COLORS.open,
        },
        {
          label: "Pending",
          color: STATUS_COLORS.pending,
        },
      ],

      segments: [
        closedPct,
        openPct,
        pendingPct,
      ],

      centerValue: `${Math.round(closedPct)}%`,
      centerLabel: "Closed",
    },
  };
}