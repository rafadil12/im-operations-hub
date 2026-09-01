"use client";

import { useEffect, useState } from "react";
import type { BarItem } from "@/data/overview";
import { useLang } from "@/lib/i18n";

/** ~38px row (label + optional sublabel + bar) + 10px gap between rows. */
const BAR_ROW_HEIGHT_PX = 38;
const BAR_ROW_GAP_PX = 10;

function barChartMinHeight(minRows: number): number {
  return minRows * BAR_ROW_HEIGHT_PX + Math.max(0, minRows - 1) * BAR_ROW_GAP_PX;
}

type BarChartPlaceholderProps = {
  items: BarItem[];
  /** Reserve vertical space for at least this many rows when data is sparse or empty. */
  minRows?: number;
};

export function BarChartPlaceholder({ items, minRows = 3 }: BarChartPlaceholderProps) {
  const { t } = useLang();
  const minHeight = barChartMinHeight(minRows);

  if (items.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-text-muted"
        style={{ minHeight }}
      >
        {t.common.noData}
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col justify-between gap-2.5"
      style={{ minHeight: items.length < minRows ? minHeight : undefined }}
    >
      {items.map((item, index) => {
        const width = Math.max(8, Math.round((item.value / item.max) * 100));
        return (
          <div key={`${item.label}-${index}`}>
            <div className="mb-0.5 flex items-start justify-between gap-2 text-[11px]">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">{item.label}</p>
                {item.sublabel ? <p className="truncate text-text-muted">{item.sublabel}</p> : null}
              </div>
              <span className="shrink-0 font-medium text-text">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border-subtle">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${width}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

type VerticalBarChartPlaceholderProps = {
  items: BarItem[];
};

export function VerticalBarChartPlaceholder({ items }: VerticalBarChartPlaceholderProps) {
  const max = Math.max(...items.map((item) => item.max), 1);

  return (
    <div className="flex h-full min-h-28 items-end gap-1.5 pt-4">
      {items.map((item, index) => {
        const height = Math.max(8, Math.round((item.value / max) * 100));
        return (
          <div
            key={`${item.label}-${index}`}
            className="flex h-full min-w-0 flex-1 flex-col items-center gap-1"
          >
            <span className="text-[10px] font-semibold text-text">{item.value}</span>
            <div className="flex min-h-0 w-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-[18px] rounded-t-sm transition-all"
                style={{
                  height: `${height}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
            <span className="truncate text-[9px] text-text-dim">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

type DonutChartPlaceholderProps = {
  legend: { label: string; color: string }[];
  /** Percentages 0–100 aligned with legend order. Defaults to mock split. */
  segments?: number[];
  centerValue?: string;
  centerLabel?: string;
  /** Center pie + legend as a block (e.g. Daily Operation / Safety category). */
  align?: "start" | "center";
  /** Legend beside (row) or under (column) the donut. */
  layout?: "row" | "column";
  /** Split legend into label row + percentage row (under column layout). */
  legendVariant?: "list" | "split";
  /** Donut diameter. */
  size?: "md" | "lg";
};

const DONUT_ANIM_MS = 2000;

const DONUT_SIZE_CLASS = {
  md: "size-28",
  lg: "size-44",
} as const;

const DONUT_HOLE_CLASS = {
  md: "inset-3",
  lg: "inset-4",
} as const;

const DONUT_VALUE_CLASS = {
  md: "text-lg",
  lg: "text-2xl",
} as const;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function resolveSegments(legend: { color: string }[], segments?: number[]): number[] {
  if (segments && segments.length === legend.length) return segments;
  return legend.map((_, i) => (i === 0 ? 78.4 : i === 1 ? 16.8 : 4.8));
}

function buildConicGradient(legend: { color: string }[], segments: number[]): string {
  let cursor = 0;
  const stops: string[] = [];
  for (let i = 0; i < legend.length; i++) {
    const share = segments[i] ?? 0;
    const start = cursor;
    cursor = Math.min(100, cursor + share);
    stops.push(`${legend[i].color} ${start}% ${cursor}%`);
  }
  if (cursor < 100) {
    stops.push(`var(--border) ${cursor}% 100%`);
  }
  return `conic-gradient(${stops.join(", ")})`;
}

export function DonutChartPlaceholder({
  legend,
  segments,
  centerValue = "78%",
  centerLabel = "Done",
  align = "start",
  layout = "row",
  legendVariant = "list",
  size = "md",
}: DonutChartPlaceholderProps) {
  const targetSegments = resolveSegments(legend, segments);
  const segmentsKey = targetSegments.join("|");
  const [animatedSegments, setAnimatedSegments] = useState(() => targetSegments.map(() => 0));

  useEffect(() => {
    const targets = segmentsKey.split("|").map(Number);
    let frame = 0;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      frame = requestAnimationFrame(() => {
        setAnimatedSegments(targets);
      });
      return () => cancelAnimationFrame(frame);
    }

    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DONUT_ANIM_MS);
      const eased = easeOutCubic(t);
      setAnimatedSegments(targets.map((v) => v * eased));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [segmentsKey]);

  const centered = align === "center" || layout === "column";
  const isColumn = layout === "column";
  const splitLegend = legendVariant === "split" && isColumn;
  const legendColumns = { gridTemplateColumns: `repeat(${legend.length}, minmax(0, 1fr))` };

  return (
    <div
      className={[
        "flex gap-4",
        isColumn ? "flex-col items-center" : "items-center",
        centered ? "justify-center" : "",
        splitLegend ? "w-full" : "",
      ].join(" ")}
    >
      <div
        className={["relative shrink-0 rounded-full", DONUT_SIZE_CLASS[size]].join(" ")}
        style={{
          background: buildConicGradient(legend, animatedSegments),
        }}
        role="img"
        aria-label="Task status donut chart"
      >
        <div className={["absolute rounded-full bg-surface", DONUT_HOLE_CLASS[size]].join(" ")} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className={["font-semibold text-text", DONUT_VALUE_CLASS[size]].join(" ")}>
              {centerValue}
            </p>
            <p className="text-[10px] text-text-dim">{centerLabel}</p>
          </div>
        </div>
      </div>
      {splitLegend ? (
        <div className="w-full px-1">
          <div className="grid gap-x-2 text-center" style={legendColumns}>
            {legend.map((item) => (
              <p
                key={`${item.label}-label`}
                className="truncate text-[11px] font-semibold"
                style={{ color: item.color }}
                title={item.label}
              >
                {item.label}
              </p>
            ))}
          </div>
          <div className="mt-1 grid gap-x-2 text-center" style={legendColumns}>
            {legend.map((item, index) => (
              <p
                key={`${item.label}-pct`}
                className="text-[11px] font-semibold tabular-nums"
                style={{ color: item.color }}
              >
                {Number((animatedSegments[index] ?? 0).toFixed(1))}%
              </p>
            ))}
          </div>
        </div>
      ) : (
        <ul
          className={[
            isColumn ? "flex flex-wrap justify-center gap-x-4 gap-y-2" : "space-y-2",
          ].join(" ")}
        >
          {legend.map((item, index) => (
            <li key={item.label} className="flex items-center gap-2 text-xs text-text-muted">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span>
                {item.label}
                {targetSegments[index] != null
                  ? ` — ${Number(targetSegments[index].toFixed(1))}%`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
