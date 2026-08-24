import type { ModuleCardData } from "@/data/overview-mock";
import type { Lang, SparepartAnalysisResult } from "@/lib/types";

const BAR_COLORS = ["#a855f7", "#c084fc", "#d8b4fe", "#e9d5ff"];

export function mapSparepartToOverview(
  base: ModuleCardData,
  result: SparepartAnalysisResult,
  lang: Lang,
): ModuleCardData {
  const maxBar = Math.max(1, ...result.mostUsed.map((item) => item.qty));

  return {
    ...base,
    stats: [
      {
        label: "Total Items",
        value: String(result.totalItems),
        tone: "accent",
      },
      {
        label: "Zero Stock",
        value: String(result.zeroStock),
        tone: "warning",
      },
      {
        label: "Usage This Month",
        value: String(result.usageThisMonth),
        tone: "accent",
      },
      {
        label: "Qty Usage This Year",
        value: String(result.usageThisYear),
        tone: "accent",
      },
    ],
    bars: {
      title: "Most Used Items (This Month)",
      items: result.mostUsed.map((item, index) => ({
        label: item.code,
        sublabel:
          lang === "cn"
            ? item.name_cn || item.name_en || item.code
            : item.name_en || item.name_cn || item.code,
        value: item.qty,
        max: maxBar,
        color: BAR_COLORS[index % BAR_COLORS.length],
      })),
    },
    chart: {
      title: "Used Trend",
      type: "trend",
      legend: [
        { label: "This Year", color: "#25ebb3" },
        { label: "Last Year", color: "#C9D1DB" },
      ],
      series: result.usedTrend.map((point) => ({
        date: point.date,
        current: point.current,
        previous: point.previous,
      })),
    },
    stockFlows: undefined,
  };
}
