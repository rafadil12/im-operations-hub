"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { localizedName, useLang } from "@/lib/i18n";
import { categoryColor } from "@/lib/sparepart/categories";
import type {
  SparepartOverviewByCategory,
  SparepartOverviewTypeSlice,
} from "@/lib/sparepart/overview";
import { TYPE_COLORS, useChartTheme } from "./chartTheme";

type DonutProps = {
  slices: { name: string; value: number; color: string }[];
  centerValue: string;
  centerLabel: string;
};

function Donut({ slices, centerValue, centerLabel }: DonutProps) {
  const colors = useChartTheme();
  const data = slices.filter((s) => s.value > 0);
  const chartData = data.length ? data : [{ name: "—", value: 1, color: colors.grid }];

  return (
    <div className="flex h-full min-h-52 items-center gap-4">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 8,
                color: colors.tooltipText,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-text">{centerValue}</span>
          <span className="text-[10px] uppercase text-text-dim">{centerLabel}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {slices.map((slice) => (
          <li key={slice.name} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ background: slice.color }} />
              <span className="truncate text-text-muted">{slice.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-text">{slice.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CategoryDonut({ rows }: { rows: SparepartOverviewByCategory[] }) {
  const { t, lang } = useLang();
  const slices = rows.map((row) => ({
    name: localizedName({ name_en: row.name_en, name_cn: row.name_cn }, lang),
    value: row.currentStock,
    color: categoryColor(row.code),
  }));
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <Donut slices={slices} centerValue={total.toLocaleString()} centerLabel={t.sparepart.qty} />
  );
}

export function TypeDonut({ slices }: { slices: SparepartOverviewTypeSlice[] }) {
  const { t } = useLang();
  const labels = {
    in: t.sparepart.incoming,
    out: t.sparepart.outgoing,
    transfer: t.sparepart.transfer,
    reversal: t.sparepart.reversal,
  };
  const mapped = slices.map((slice) => ({
    name: labels[slice.type],
    value: slice.qty,
    color: TYPE_COLORS[slice.type],
  }));
  const total = mapped.reduce((sum, s) => sum + s.value, 0);
  return (
    <Donut slices={mapped} centerValue={total.toLocaleString()} centerLabel={t.sparepart.qty} />
  );
}
