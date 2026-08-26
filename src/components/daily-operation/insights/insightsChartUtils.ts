"use client";

import { toBlob, toPng } from "html-to-image";
import { localizedName } from "@/lib/i18n";
import { CHART_COLORS, useTheme, type ChartColors } from "@/lib/theme";
import type { Lang, NamedCount } from "@/lib/types";

export const PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#64748b",
];

export const DIVISION_PALETTE = ["#6366f1", "#ef4444", "#22c55e", "#f59e0b"];
export const COMPACT_TOP_N = 8;
export const USER_RANKING_COMPACT_TOP_N = 9;
/** Neutral used for aggregated "others" rows; readable on both themes. */
export const NEUTRAL = "#64748b";

/** Hook for the chart neutrals of the active theme. */
export function useChartColors(): ChartColors {
  const { theme } = useTheme();
  return CHART_COLORS[theme];
}

type StyleBackup = { el: HTMLElement; cssText: string };

/** Temporarily remove overflow/max-height clips so html-to-image can capture full scroll content. */
function prepareFullCapture(root: HTMLElement): () => void {
  const backups: StyleBackup[] = [];

  const unlock = (el: HTMLElement) => {
    const computed = getComputedStyle(el);
    const clipped =
      computed.overflow !== "visible" ||
      computed.overflowY !== "visible" ||
      computed.overflowX !== "visible" ||
      (computed.maxHeight !== "none" && computed.maxHeight !== "");
    if (!clipped && el !== root) return;
    backups.push({ el, cssText: el.style.cssText });
    el.style.setProperty("max-height", "none", "important");
    el.style.setProperty("overflow", "visible", "important");
    el.style.setProperty("overflow-x", "visible", "important");
    el.style.setProperty("overflow-y", "visible", "important");
  };

  unlock(root);
  root.querySelectorAll<HTMLElement>("*").forEach(unlock);

  let parent: HTMLElement | null = root.parentElement;
  while (parent) {
    unlock(parent);
    if (parent.getAttribute("role") === "dialog") break;
    parent = parent.parentElement;
  }

  return () => {
    for (const backup of backups) {
      backup.el.style.cssText = backup.cssText;
    }
  };
}

export async function captureChartImage(
  node: HTMLElement,
  mode: "png" | "blob",
  backgroundColor: string
): Promise<string | Blob> {
  const restore = prepareFullCapture(node);
  try {
    // Wait two frames so layout expands after unlocking overflow.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const options = {
      pixelRatio: 2,
      backgroundColor,
      cacheBust: true,
      width: Math.ceil(node.scrollWidth),
      height: Math.ceil(node.scrollHeight),
    };

    if (mode === "png") {
      return await toPng(node, options);
    }
    const blob = await toBlob(node, options);
    if (!blob) throw new Error("Failed to create image blob");
    return blob;
  } finally {
    restore();
  }
}

export function tooltipStyleFor(colors: ChartColors) {
  return {
    background: colors.tooltipBg,
    border: `1px solid ${colors.tooltipBorder}`,
    borderRadius: 8,
    color: colors.tooltipText,
    fontSize: 12,
  };
}

export type Slice = { label: string; value: number; color: string };
export type BarRow = { label: string; count: number; color: string };

/** Merge rows that share the same display label; keep first-seen color. */
export function mergeNamedCounts(
  rows: NamedCount[],
  lang: Lang,
  colorFor: (row: NamedCount, label: string, index: number) => string
): Slice[] {
  const merged = new Map<string, Slice>();
  for (const r of rows) {
    const label = localizedName(r, lang);
    const existing = merged.get(label);
    if (existing) {
      existing.value += r.count;
    } else {
      merged.set(label, {
        label,
        value: r.count,
        color: colorFor(r, label, merged.size),
      });
    }
  }
  return Array.from(merged.values());
}

export function takeTopN(rows: BarRow[], n: number, othersLabel: string): BarRow[] {
  if (rows.length <= n) return rows;
  const top = rows.slice(0, n);
  const rest = rows.slice(n);
  const othersCount = rest.reduce((sum, r) => sum + r.count, 0);
  if (othersCount <= 0) return top;
  return [...top, { label: othersLabel, count: othersCount, color: NEUTRAL }];
}

export function takeTopNSlices(rows: Slice[], n: number, othersLabel: string): Slice[] {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  if (sorted.length <= n) return sorted;
  const top = sorted.slice(0, n);
  const rest = sorted.slice(n);
  const othersValue = rest.reduce((sum, r) => sum + r.value, 0);
  if (othersValue <= 0) return top;
  return [...top, { label: othersLabel, value: othersValue, color: NEUTRAL }];
}
