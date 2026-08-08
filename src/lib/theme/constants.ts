import type { Theme } from "@/lib/types";

export const THEME_STORAGE_KEY = "im-ops-theme";
export const DEFAULT_THEME: Theme = "dark";

/**
 * Chart neutrals (grid, axes, tooltips, export background) per theme.
 * Recharts and html-to-image need literal colors rather than CSS variables,
 * so these mirror the token values in globals.css.
 */
export type ChartColors = {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipMuted: string;
  cursor: string;
  captureBg: string;
};

export const CHART_COLORS: Record<Theme, ChartColors> = {
  dark: {
    grid: "#243047",
    axis: "#5c6b86",
    tooltipBg: "#151f32",
    tooltipBorder: "#243047",
    tooltipText: "#e8eef8",
    tooltipMuted: "#9aa8c0",
    cursor: "rgba(99, 102, 241, 0.1)",
    captureBg: "#151f32",
  },
  light: {
    grid: "#e2e8f0",
    axis: "#64748b",
    tooltipBg: "#ffffff",
    tooltipBorder: "#e2e8f0",
    tooltipText: "#0f172a",
    tooltipMuted: "#55637a",
    cursor: "rgba(37, 99, 235, 0.08)",
    captureBg: "#ffffff",
  },
};

/**
 * Inlined in the document head so the theme is set before first paint.
 * Also sets background immediately to avoid a frame of the wrong :root colors.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t="${DEFAULT_THEME}";var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t;r.style.backgroundColor=t==="light"?"#f4f6fa":"#0b1220";}catch(e){}})();`;
