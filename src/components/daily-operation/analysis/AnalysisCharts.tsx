"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toBlob, toPng } from "html-to-image";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Modal } from "@/components/ui/Modal";
import { localizedName, useLang } from "@/lib/i18n";
import { CHART_COLORS, useTheme, type ChartColors } from "@/lib/theme";
import type { AnalysisResult, Lang, NamedCount } from "@/lib/types";

const PALETTE = [
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

const DIVISION_PALETTE = ["#6366f1", "#ef4444", "#22c55e", "#f59e0b"];
const COMPACT_TOP_N = 8;
const USER_RANKING_COMPACT_TOP_N = 9;
/** Neutral used for aggregated "others" rows; readable on both themes. */
const NEUTRAL = "#64748b";

/** Hook for the chart neutrals of the active theme. */
function useChartColors(): ChartColors {
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

async function captureChartImage(
  node: HTMLElement,
  mode: "png" | "blob",
  backgroundColor: string,
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

function tooltipStyleFor(colors: ChartColors) {
  return {
    background: colors.tooltipBg,
    border: `1px solid ${colors.tooltipBorder}`,
    borderRadius: 8,
    color: colors.tooltipText,
    fontSize: 12,
  };
}

type Slice = { label: string; value: number; color: string };
type BarRow = { label: string; count: number; color: string };

/** Merge rows that share the same display label; keep first-seen color. */
function mergeNamedCounts(
  rows: NamedCount[],
  lang: Lang,
  colorFor: (row: NamedCount, label: string, index: number) => string,
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

function takeTopN(rows: BarRow[], n: number, othersLabel: string): BarRow[] {
  if (rows.length <= n) return rows;
  const top = rows.slice(0, n);
  const rest = rows.slice(n);
  const othersCount = rest.reduce((sum, r) => sum + r.count, 0);
  if (othersCount <= 0) return top;
  return [...top, { label: othersLabel, count: othersCount, color: NEUTRAL }];
}

function takeTopNSlices(rows: Slice[], n: number, othersLabel: string): Slice[] {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  if (sorted.length <= n) return sorted;
  const top = sorted.slice(0, n);
  const rest = sorted.slice(n);
  const othersValue = rest.reduce((sum, r) => sum + r.value, 0);
  if (othersValue <= 0) return top;
  return [...top, { label: othersLabel, value: othersValue, color: NEUTRAL }];
}

function ChartValueTooltip({
  active,
  payload,
  total,
  valueKey = "value",
  colors,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
  total: number;
  valueKey?: "value" | "count";
  colors: ChartColors;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  const label = String(row.label ?? "");
  const value = Number(row[valueKey] ?? 0);
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div style={tooltipStyleFor(colors)} className="px-2.5 py-1.5 shadow-lg">
      <p className="font-medium" style={{ color: colors.tooltipText }}>
        {label}
      </p>
      <p style={{ color: colors.tooltipMuted }}>total : {value}</p>
      <p style={{ color: colors.tooltipMuted }}>{pct.toFixed(1)}%</p>
    </div>
  );
}

function HorizontalBarChart({
  data,
  height,
  yAxisWidth = 120,
  truncateLabels = false,
}: {
  data: BarRow[];
  height: number;
  yAxisWidth?: number;
  truncateLabels?: boolean;
}) {
  const colors = useChartColors();
  const total = data.reduce((sum, row) => sum + row.count, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
        <XAxis type="number" stroke={colors.axis} fontSize={11} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          stroke={colors.axis}
          fontSize={10}
          width={yAxisWidth}
          tickFormatter={(value) => {
            const text = String(value);
            if (!truncateLabels) return text;
            return text.length > 16 ? `${text.slice(0, 16)}…` : text;
          }}
        />
        <Tooltip
          cursor={{ fill: colors.cursor }}
          content={
            <ChartValueTooltip total={total} valueKey="count" colors={colors} />
          }
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={`${d.label}-${i}`} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
function CustomXAxisTick({
  x,
  y,
  payload,
  fill,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  fill: string;
}) {
  if (x == null || y == null || !payload) return null;

  const text = String(payload.value);
  const words = text.split(" ");

  let line1 = text;
  let line2 = "";

  if (words.length > 1) {
    const middle = Math.ceil(words.length / 2);
    line1 = words.slice(0, middle).join(" ");
    line2 = words.slice(middle).join(" ");
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        fill={fill}
        fontSize={10}
      >
        <tspan x="0">{line1}</tspan>

        {line2 && (
          <tspan x="0" dy="13">
            {line2}
          </tspan>
        )}
      </text>
    </g>
  );
}

function VerticalBarChart({
  data,
  height,
  compactLabels = false,
}: {
  data: BarRow[];
  height: number;
  compactLabels?: boolean;
}) {
  const colors = useChartColors();
  const total = data.reduce((sum, row) => sum + row.count, 0);

  // Tambahkan nomor untuk label X-axis saat expanded
  const chartData = data.map((row, index) => ({
    ...row,
    shortLabel: String(index + 1),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{
          top: 10,
          right: 10,
          left: 0,
          bottom: compactLabels ? 10 : 15,
        }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={colors.grid}
          vertical={false}
        />

        {compactLabels ? (
          <XAxis
            dataKey="shortLabel"
            tick={false}
            axisLine={true}
            tickLine={false}
            height={10}
          />
        ) : (
          <XAxis
            dataKey="label"
            stroke={colors.axis}
            interval={0}
            height={55}
            tick={<CustomXAxisTick fill={colors.axis} />}
          />
        )}

        <YAxis
          stroke={colors.axis}
          fontSize={11}
          allowDecimals={false}
        />

        <Tooltip
          cursor={{ fill: colors.cursor }}
          content={
            <ChartValueTooltip
              total={total}
              valueKey="count"
              colors={colors}
            />
          }
        />

        <Bar
          dataKey="count"
          radius={[4, 4, 0, 0]}
        >
          {chartData.map((d, i) => (
            <Cell
              key={`${d.label}-${i}`}
              fill={d.color}
            />
          ))}
          <LabelList
            dataKey="count"
            position="top"
            fill={colors.tooltipMuted}
            fontSize={10}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

type PieLabelLayout = {
  index: number;
  percent: number;
  midAngle: number;
  side: "left" | "right";
  /** Final label Y relative to pie center (after collision spacing). */
  y: number;
};

/** Outside-label positions with per-side vertical spacing so small slices stay readable. */
function computePieLabelLayout(slices: Slice[], outerRadius: number): PieLabelLayout[] {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const RADIAN = Math.PI / 180;
  const labelRadius = outerRadius + 14;
  let cumulative = 0;

  const entries: PieLabelLayout[] = slices.map((slice, index) => {
    const startAngle = (cumulative / total) * 360;
    cumulative += slice.value;
    const endAngle = (cumulative / total) * 360;
    const midAngle = (startAngle + endAngle) / 2;
    const cos = Math.cos(-midAngle * RADIAN);
    const sin = Math.sin(-midAngle * RADIAN);
    return {
      index,
      percent: slice.value / total,
      midAngle,
      side: cos >= 0 ? "right" : "left",
      y: labelRadius * sin,
    };
  });

  const MIN_GAP = 18;
  for (const side of ["left", "right"] as const) {
    const group = entries.filter((e) => e.side === side).sort((a, b) => a.y - b.y);
    for (let i = 1; i < group.length; i++) {
      if (group[i].y - group[i - 1].y < MIN_GAP) {
        group[i].y = group[i - 1].y + MIN_GAP;
      }
    }
    // Keep the block roughly centered around the pie.
    if (group.length > 1) {
      const firstIdeal = labelRadius * Math.sin(-group[0].midAngle * RADIAN);
      const lastIdeal = labelRadius * Math.sin(-group[group.length - 1].midAngle * RADIAN);
      const idealMid = (firstIdeal + lastIdeal) / 2;
      const actualMid = (group[0].y + group[group.length - 1].y) / 2;
      const shift = idealMid - actualMid;
      for (const item of group) item.y += shift;
    }
  }

  return entries;
}

function createPiePercentLabel(
  layouts: PieLabelLayout[],
  slices: Slice[],
  fallbackColor: string,
) {
  return function PiePercentLabel({
    cx,
    cy,
    midAngle,
    outerRadius,
    percent,
    index,
  }: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    outerRadius?: number;
    percent?: number;
    index?: number;
  }) {
    if (
      cx == null ||
      cy == null ||
      midAngle == null ||
      outerRadius == null ||
      percent == null ||
      index == null
    ) {
      return null;
    }
    const layout = layouts[index];
    const color = slices[index]?.color ?? fallbackColor;
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);
    const sx = cx + outerRadius * cos;
    const sy = cy + outerRadius * sin;
    const mx = cx + (outerRadius + 14) * cos;
    const my = cy + (outerRadius + 14) * sin;
    const ex = cx + (cos >= 0 ? 1 : -1) * (outerRadius + 28);
    const ey = cy + (layout?.y ?? my - cy);
    const textAnchor = cos >= 0 ? "start" : "end";
    const textX = ex + (cos >= 0 ? 1 : -1) * 6;

    return (
      <g style={{ pointerEvents: "none" }}>
        <path
          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
          stroke={color}
          fill="none"
          strokeWidth={1}
          opacity={0.85}
        />
        <circle cx={ex} cy={ey} r={2} fill={color} stroke="none" />
        <text
          x={textX}
          y={ey}
          fill={color}
          textAnchor={textAnchor}
          dominantBaseline="central"
          fontSize={11}
          fontWeight={600}
        >
          {`${(percent * 100).toFixed(1)}%`}
        </text>
      </g>
    );
  };
}

function PieWithLegend({
  slices,
  chartHeight = 220,
  legendMaxHeight = 224,
}: {
  slices: Slice[];
  chartHeight?: number;
  legendMaxHeight?: number;
}) {
  const colors = useChartColors();
  const total = slices.reduce((s, x) => s + x.value, 0);
  // Leave generous margin for outside labels + leader lines on both sides.
  const pieRadius = Math.min(Math.max(64, chartHeight * 0.28), chartHeight / 2 - 72);
  const labelLayouts = useMemo(
    () => computePieLabelLayout(slices, pieRadius),
    [slices, pieRadius],
  );
  const renderLabel = useMemo(
    () => createPiePercentLabel(labelLayouts, slices, colors.tooltipText),
    [labelLayouts, slices, colors.tooltipText],
  );

  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row">
      <ResponsiveContainer width="100%" height={chartHeight} minWidth={0}>
        <PieChart margin={{ top: 24, right: 56, bottom: 24, left: 56 }}>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            outerRadius={pieRadius}
            label={renderLabel}
            labelLine={false}
          >
            {slices.map((s, i) => (
              <Cell key={`${s.label}-${i}`} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            content={
              <ChartValueTooltip
                total={total}
                valueKey="value"
                colors={colors}
              />
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <ul
        className="w-full space-y-1 overflow-y-auto sm:w-56 sm:shrink-0 scrollbar-none"
        style={{ maxHeight: legendMaxHeight }}
      >
        {slices.map((s, i) => (
          <li key={`${s.label}-${i}`} className="flex items-center gap-2 text-[11px] text-text-muted">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="flex-1 truncate" title={s.label}>
              {s.label}
            </span>
            <span className="text-text">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartCard({
  title,
  children,
  expandedContent,
  className,
  modalSize = "xl",
}: {
  title: string;
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  className?: string;
  modalSize?: "md" | "lg" | "xl" | "2xl";
}) {
  const { t } = useLang();
  const colors = useChartColors();
  const [open, setOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "copying" | "copied" | "failed">(
    "idle",
  );
  const exportRef = useRef<HTMLDivElement>(null);
  const captureBg = colors.captureBg;

  const runExport = useCallback(async (mode: "download" | "copy") => {
    const node = exportRef.current;
    if (!node) return;

    try {
      if (mode === "download") {
        const dataUrl = (await captureChartImage(node, "png", captureBg)) as string;
        const link = document.createElement("a");
        const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        link.download = `${safeName || "chart"}.png`;
        link.href = dataUrl;
        link.click();
        return;
      }

      setExportStatus("copying");
      const blob = (await captureChartImage(node, "blob", captureBg)) as Blob;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setExportStatus("copied");
      window.setTimeout(() => setExportStatus("idle"), 1800);
    } catch {
      setExportStatus("failed");
      window.setTimeout(() => setExportStatus("idle"), 2200);
    }
  }, [title, captureBg]);

  const copyLabel =
    exportStatus === "copying"
      ? t.analysis.copying
      : exportStatus === "copied"
        ? t.analysis.copied
        : exportStatus === "failed"
          ? t.analysis.copyFailed
          : t.analysis.copyImage;

  return (
    <>
      <section
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`cursor-pointer rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-hover/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${className ?? ""}`}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <span className="shrink-0 rounded-md border border-border-subtle px-2 py-0.5 text-[10px] text-text-dim">
            {t.analysis.clickToExpand}
          </span>
        </div>
        <div>{children}</div>
      </section>

      {open ? (
        <Modal
          title={title}
          size={modalSize}
          onClose={() => {
            setOpen(false);
            setExportStatus("idle");
          }}
          headerActions={
            <>
              <button
                type="button"
                onClick={() => runExport("download")}
                className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              >
                {t.analysis.downloadPng}
              </button>
              <button
                type="button"
                onClick={() => runExport("copy")}
                disabled={exportStatus === "copying"}
                className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text disabled:opacity-60"
              >
                {copyLabel}
              </button>
            </>
          }
        >
          <div ref={exportRef} className="rounded-lg bg-surface p-2">
            {expandedContent ?? children}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

export function AnalysisCharts({ result }: { result: AnalysisResult }) {
  const { lang, t } = useLang();
  const colors = useChartColors();
  const byCategory = result.byCategory ?? [];
  const bySubcategory = result.bySubcategory ?? [];
  const byDivision = result.byDivision ?? [];
  const userRanking = result.userRanking ?? [];

  const divisionColor = useMemo(() => {
    const map: Record<string, string> = {};
    (result.byDivision ?? []).forEach((d, i) => {
      const key = d.name_en?.trim() || localizedName(d, "en");
      map[key] = DIVISION_PALETTE[i % DIVISION_PALETTE.length];
    });
    return map;
  }, [result.byDivision]);

  const categorySlices = useMemo(
    () =>
      mergeNamedCounts(byCategory, lang, (_r, _label, i) => PALETTE[i % PALETTE.length]).sort(
        (a, b) => b.value - a.value,
      ),
    [byCategory, lang],
  );

  const categoryCompact = takeTopNSlices(categorySlices, COMPACT_TOP_N, t.analysis.others);

  const divisionSlices: Slice[] = mergeNamedCounts(
    byDivision,
    lang,
    (d, label) => divisionColor[d.name_en?.trim() || label] ?? NEUTRAL,
  );

  const divisionBar = divisionSlices.map((s) => ({
    label: s.label,
    count: s.value,
    color: s.color,
  }));

  const subcategoryBar = useMemo(
    () =>
      mergeNamedCounts(bySubcategory, lang, (_r, _label, i) => PALETTE[i % PALETTE.length])
        .map((s) => ({
          label: s.label,
          count: s.value,
          color: s.color,
        }))
        .sort((a, b) => b.count - a.count),
    [bySubcategory, lang],
  );

  const subcategoryCompact = takeTopN(
    subcategoryBar,
    COMPACT_TOP_N,
    t.analysis.others,
  );

  const maxUser = Math.max(1, ...userRanking.map((u) => u.count));

  // Group duration points by division for a colored scatter series each.
  const durationByDivision = useMemo(() => {
    const groups: Record<string, { division: string; duration_hours: number }[]> = {};
    for (const p of result.durationPerDivision ?? []) {
      const key = p.division?.trim() || "Unknown";
      (groups[key] ??= []).push({ division: key, duration_hours: p.duration_hours });
    }
    return groups;
  }, [result.durationPerDivision]);

  const subcategoryExpandedHeight = Math.max(360, subcategoryBar.length * 28 + 40);
  const userRankingExpanded = userRanking;
  const userRankingCompact = userRanking.slice(0, USER_RANKING_COMPACT_TOP_N);

  function renderUserRanking(rows: typeof userRanking) {
    if (rows.length === 0) {
      return <p className="py-8 text-center text-sm text-text-muted">{t.common.noData}</p>;
    }
    return (
      <>
        <ul className="space-y-2.5">
          {rows.map((u, i) => {
            const left = Math.max(4, (u.count / maxUser) * 100);
            const color = divisionColor[u.division?.trim() ?? ""] ?? NEUTRAL;
            return (
              <li key={`${u.name_en}-${u.name_cn}-${i}`} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-[11px] text-text-muted" title={localizedName(u, lang)}>
                  {localizedName(u, lang)}
                </span>
                <div className="relative h-4 flex-1">
                  <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-border-subtle" />
                  <div
                    className="absolute top-1/2 h-px -translate-y-1/2 bg-border"
                    style={{ width: `${left}%` }}
                  />
                  <span
                    className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                    style={{ left: `${left}%`, backgroundColor: color }}
                  />
                </div>
                <span className="w-6 text-right text-[11px] font-semibold text-text">
                  {u.count}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-wrap gap-3 border-t border-border-subtle pt-2">
          {divisionSlices.map((d, i) => (
            <span key={`${d.label}-${i}`} className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              {d.label}
            </span>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title={t.analysis.categoryDistribution}
          modalSize="2xl"
          expandedContent={
            categorySlices.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">{t.common.noData}</p>
            ) : (
              <PieWithLegend
                slices={categorySlices}
                chartHeight={Math.max(560, categorySlices.length * 22 + 200)}
                legendMaxHeight={Math.max(560, categorySlices.length * 22 + 200)}
              />
            )
          }
        >
          {categorySlices.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">{t.common.noData}</p>
          ) : (
            <div>
              <PieWithLegend slices={categoryCompact} chartHeight={280} legendMaxHeight={280} />
              {categorySlices.length > COMPACT_TOP_N ? (
                <p className="mt-2 text-[11px] text-text-dim">
                  {t.analysis.showingTop.replace("{n}", String(COMPACT_TOP_N))} ·{" "}
                  {categorySlices.length} total
                </p>
              ) : null}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={t.analysis.userRanking}
          expandedContent={
            <div className="max-h-[65vh] overflow-y-auto pr-1">
              {renderUserRanking(userRankingExpanded)}
            </div>
          }
        >
          {renderUserRanking(userRankingCompact)}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title={t.analysis.subCategoryDistribution}
          expandedContent={
          subcategoryBar.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              {t.common.noData}
            </p>
          ) : (
            <div className="w-full">

              {/* GRAFIK */}
              <VerticalBarChart
                data={subcategoryBar}
                height={500}
                compactLabels
              />

              {/* SUB CATEGORY DI BAWAH */}
              <div className="mt-5 border-t border-border-subtle pt-4">

                <p className="mb-3 text-xs font-semibold text-text">
                  Sub Category
                </p>

                <div className="grid grid-cols-8 gap-x-6 gap-y-2">
                  {subcategoryBar.map((item, index) => (
                    <div
                      key={`${item.label}-${index}`}
                      className="flex min-w-0 items-center gap-2 text-[8.5px]"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />

                      <span
                        className="truncate text-text-muted"
                        title={item.label}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

              </div>

            </div>
          )
        }
        >
          {subcategoryBar.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">{t.common.noData}</p>
          ) : (
            <div>
              <VerticalBarChart
                data={subcategoryCompact}
                height={300}
              />
              {subcategoryBar.length > COMPACT_TOP_N ? (
                <p className="mt-2 text-[11px] text-text-dim">
                  {t.analysis.showingTop.replace("{n}", String(COMPACT_TOP_N))} ·{" "}
                  {subcategoryBar.length} total
                </p>
              ) : null}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={t.analysis.divisionDistribution}
          modalSize="2xl"
          expandedContent={
            <PieWithLegend slices={divisionSlices} chartHeight={560} legendMaxHeight={560} />
          }
        >
          <PieWithLegend slices={divisionSlices} chartHeight={280} legendMaxHeight={280} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title={t.analysis.divisionAnalysis}
          expandedContent={
            <HorizontalBarChart data={divisionBar} height={360} yAxisWidth={160} />
          }
        >
          <HorizontalBarChart data={divisionBar} height={260} yAxisWidth={130} truncateLabels />
        </ChartCard>

        <ChartCard
          title={t.analysis.durationAnalysis}
          expandedContent={
            <ResponsiveContainer width="100%" height={420}>
              <ScatterChart margin={{ bottom: 8, left: 4, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis
                  type="category"
                  dataKey="division"
                  name="division"
                  stroke={colors.axis}
                  fontSize={11}
                  allowDuplicatedCategory={false}
                />
                <YAxis
                  type="number"
                  dataKey="duration_hours"
                  name="duration_hours"
                  stroke={colors.axis}
                  fontSize={11}
                  unit="h"
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={tooltipStyleFor(colors)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {Object.entries(durationByDivision).map(([division, points]) => (
                  <Scatter
                    key={division}
                    name={division}
                    data={points}
                    fill={divisionColor[division] ?? NEUTRAL}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ bottom: 8, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                type="category"
                dataKey="division"
                name="division"
                stroke={colors.axis}
                fontSize={10}
                allowDuplicatedCategory={false}
              />
              <YAxis
                type="number"
                dataKey="duration_hours"
                name="duration_hours"
                stroke={colors.axis}
                fontSize={11}
                unit="h"
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={tooltipStyleFor(colors)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {Object.entries(durationByDivision).map(([division, points]) => (
                <Scatter
                  key={division}
                  name={division}
                  data={points}
                  fill={divisionColor[division] ?? NEUTRAL}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
