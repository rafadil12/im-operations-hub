"use client";

import type { ChartColors } from "@/lib/theme";
import { tooltipStyleFor } from "./itsmChartUtils";

export function ChartValueTooltip({
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
