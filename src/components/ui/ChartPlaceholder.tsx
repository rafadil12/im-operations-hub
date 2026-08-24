"use client";

import { useEffect, useState } from "react";
import type { BarItem } from "@/data/overview-mock";

type BarChartPlaceholderProps = {
  items: BarItem[];
};

export function BarChartPlaceholder({ items }: BarChartPlaceholderProps) {
  return (
    <div className="flex h-full flex-col justify-between gap-2.5">
      {items.map((item, index) => {
        const width = Math.max(8, Math.round((item.value / item.max) * 100));
        return (
          <div key={`${item.label}-${index}`}>
            <div className="mb-0.5 flex items-start justify-between gap-2 text-[11px]">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">{item.label}</p>
                {item.sublabel ? (
                  <p className="truncate text-text-muted">{item.sublabel}</p>
                ) : null}
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

export function VerticalBarChartPlaceholder({
  items,
}: VerticalBarChartPlaceholderProps) {
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

type TrendChartPlaceholderProps = {
  legend: { label: string; color: string }[];
};

export function TrendChartPlaceholder({ legend }: TrendChartPlaceholderProps) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3">
        {legend.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 text-[11px] text-text-muted"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <svg
        viewBox="0 0 320 90"
        className="h-24 w-full"
        role="img"
        aria-label="Ticket trend chart placeholder"
      >
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points="0,60 45,52 90,55 135,40 180,45 225,28 270,35 320,22"
        />
        <polyline
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          points="0,70 45,65 90,58 135,50 180,42 225,38 270,30 320,25"
        />
        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          points="0,75 45,72 90,68 135,70 180,62 225,66 270,58 320,55"
        />
      </svg>
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
};

const DONUT_ANIM_MS = 2000;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function resolveSegments(
  legend: { color: string }[],
  segments?: number[],
): number[] {
  if (segments && segments.length === legend.length) return segments;
  return legend.map((_, i) => (i === 0 ? 78.4 : i === 1 ? 16.8 : 4.8));
}

function buildConicGradient(
  legend: { color: string }[],
  segments: number[],
): string {
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
}: DonutChartPlaceholderProps) {
  const targetSegments = resolveSegments(legend, segments);
  const segmentsKey = targetSegments.join("|");
  const [animatedSegments, setAnimatedSegments] = useState(() =>
    targetSegments.map(() => 0),
  );

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

  const centered = align === "center";

  return (
    <div
      className={[
        "flex items-center gap-5",
        centered ? "justify-center" : "",
      ].join(" ")}
    >
      <div
        className="relative size-28 shrink-0 rounded-full"
        style={{
          background: buildConicGradient(legend, animatedSegments),
        }}
        role="img"
        aria-label="Task status donut chart"
      >
        <div className="absolute inset-3 rounded-full bg-surface" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold text-text">{centerValue}</p>
            <p className="text-[10px] text-text-dim">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="space-y-2">
        {legend.map((item, index) => (
          <li
            key={item.label}
            className="flex items-center gap-2 text-xs text-text-muted"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>
              {item.label}
              {targetSegments[index] != null
                ? ` — ${targetSegments[index]}%`
                : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
