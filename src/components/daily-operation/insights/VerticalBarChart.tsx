"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartValueTooltip } from "./ChartValueTooltip";
import { useChartColors, type BarRow } from "./insightsChartUtils";

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
      <text x={0} y={0} dy={14} textAnchor="middle" fill={fill} fontSize={10}>
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

export function VerticalBarChart({
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
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />

        {compactLabels ? (
          <XAxis dataKey="shortLabel" tick={false} axisLine={true} tickLine={false} height={10} />
        ) : (
          <XAxis
            dataKey="label"
            stroke={colors.axis}
            interval={0}
            height={55}
            tick={<CustomXAxisTick fill={colors.axis} />}
          />
        )}

        <YAxis stroke={colors.axis} fontSize={11} allowDecimals={false} />

        <Tooltip
          cursor={{ fill: colors.cursor }}
          content={<ChartValueTooltip total={total} valueKey="count" colors={colors} />}
        />

        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((d, i) => (
            <Cell key={`${d.label}-${i}`} fill={d.color} />
          ))}
          <LabelList dataKey="count" position="top" fill={colors.tooltipMuted} fontSize={10} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
