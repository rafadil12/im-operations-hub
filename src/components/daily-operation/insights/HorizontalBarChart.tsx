"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartValueTooltip } from "./ChartValueTooltip";
import { useChartColors, type BarRow } from "./insightsChartUtils";

export function HorizontalBarChart({
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
          content={<ChartValueTooltip total={total} valueKey="count" colors={colors} />}
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
