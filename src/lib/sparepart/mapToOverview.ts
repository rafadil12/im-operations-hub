import type { ModuleCardData } from "@/data/overview";
import { getDict } from "@/lib/i18n";
import type { Lang, SparepartAnalysisResult } from "@/lib/types";

const BAR_COLORS = ["#a855f7", "#c084fc", "#d8b4fe", "#e9d5ff"];

export function mapSparepartToOverview(
  base: ModuleCardData,
  result: SparepartAnalysisResult,
  lang: Lang
): ModuleCardData {
  const t = getDict(lang);
  const maxBar = Math.max(1, ...result.mostUsed.map((item) => item.qty));

  return {
    ...base,
    stats: [
      {
        label: t.dashboard.totalItems,
        value: String(result.totalItems),
        tone: "accent",
      },
      {
        label: t.dashboard.zeroStock,
        value: String(result.zeroStock),
        tone: "warning",
      },
      {
        label: t.dashboard.usageThisMonth,
        value: String(result.usageThisMonth),
        tone: "accent",
      },
      {
        label: t.dashboard.usageThisYear,
        value: String(result.usageThisYear),
        tone: "accent",
      },
    ],
    bars: {
      title: t.dashboard.mostUsedItems,
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
      title: t.dashboard.usedTrend,
      type: "trend",
      legend: [
        { label: t.dashboard.thisYear, color: "#25ebb3" },
        { label: t.dashboard.lastYear, color: "#C9D1DB" },
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
