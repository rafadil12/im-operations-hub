"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartValueTooltip } from "./ChartValueTooltip";
import { useChartColors, type Slice } from "./insightsChartUtils";

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

function createPiePercentLabel(layouts: PieLabelLayout[], slices: Slice[], fallbackColor: string) {
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

export function PieWithLegend({
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
  const labelLayouts = useMemo(() => computePieLabelLayout(slices, pieRadius), [slices, pieRadius]);
  const renderLabel = useMemo(
    () => createPiePercentLabel(labelLayouts, slices, colors.tooltipText),
    [labelLayouts, slices, colors.tooltipText]
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
          <Tooltip content={<ChartValueTooltip total={total} valueKey="value" colors={colors} />} />
        </PieChart>
      </ResponsiveContainer>
      <ul
        className="w-full space-y-1 overflow-y-auto sm:w-56 sm:shrink-0 scrollbar-none"
        style={{ maxHeight: legendMaxHeight }}
      >
        {slices.map((s, i) => (
          <li
            key={`${s.label}-${i}`}
            className="flex items-center gap-2 text-[11px] text-text-muted"
          >
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
