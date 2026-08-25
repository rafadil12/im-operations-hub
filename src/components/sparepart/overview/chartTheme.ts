"use client";

import { CHART_COLORS, useTheme } from "@/lib/theme";
import type { SparepartOverviewBarGrain } from "@/lib/sparepart/overview";

export const TYPE_COLORS = {
  in: "#22c55e",
  out: "#ef4444",
  transfer: "#3b82f6",
  reversal: "#94a3b8",
};

export function useChartTheme() {
  const { theme } = useTheme();
  return CHART_COLORS[theme];
}

export function formatMonth(month: string, lang: string): string {
  const [y, m] = month.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(lang === "cn" ? "zh-CN" : "en-US", {
    month: "short",
  });
}

export function formatDayLabel(iso: string, lang: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(lang === "cn" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Week buckets are Monday-start ISO dates; show the full Mon–Sun range. */
export function formatWeekRangeLabel(startIso: string, lang: string): string {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const locale = lang === "cn" ? "zh-CN" : "en-US";
  const startLabel = start.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
  const endLabel =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
      ? end.toLocaleDateString(locale, { day: "numeric" })
      : end.toLocaleDateString(locale, { month: "short", day: "numeric" });
  return `${startLabel}–${endLabel}`;
}

export function formatPeriodLabel(
  key: string,
  lang: string,
  grain: SparepartOverviewBarGrain = "day"
): string {
  if (grain === "month" || /^\d{4}-\d{2}$/.test(key)) return formatMonth(key, lang);
  if (grain === "week" && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return formatWeekRangeLabel(key, lang);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return formatDayLabel(key, lang);
  return key;
}
