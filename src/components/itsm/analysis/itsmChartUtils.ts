"use client";

import { toBlob, toPng } from "html-to-image";
import { CHART_COLORS, useTheme, type ChartColors } from "@/lib/theme";

export const REQUEST_TYPE_COLORS = [
  "#3B82F6", // Incident
  "#10B981", // Service Request
];

/** Hook for the chart neutrals of the active theme. */
export function useChartColors(): ChartColors {
  const { theme } = useTheme();
  return CHART_COLORS[theme];
}

type StyleBackup = { el: HTMLElement; cssText: string };

/** Temporarily remove overflow/max-height clips so html-to-image can capture full scroll content. */
export function prepareFullCapture(root: HTMLElement): () => void {
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
