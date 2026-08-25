"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLang } from "@/lib/i18n";
import {
  categoryColor,
  localizedCategoryLabel,
  type SparepartCategoryCode,
} from "@/lib/sparepart/categories";
import type {
  SparepartOverviewBarGrain,
  SparepartOverviewCategoryTab,
  SparepartOverviewMonthlyBar,
  SparepartOverviewTrendPoint,
} from "@/lib/sparepart/overview";
import { formatPeriodLabel, TYPE_COLORS, useChartTheme } from "./chartTheme";

export function InOutBars({
  rows,
  grain = "day",
}: {
  rows: SparepartOverviewMonthlyBar[];
  grain?: SparepartOverviewBarGrain;
}) {
  const { t, lang } = useLang();
  const colors = useChartTheme();
  const data = rows.map((row) => ({
    ...row,
    label: formatPeriodLabel(row.month, lang, grain),
  }));

  return (
    <ResponsiveContainer width="100%" height={205}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid stroke={colors.grid} vertical={false} strokeDasharray="4 4" />
        <XAxis
          dataKey="label"
          tick={{ fill: colors.axis, fontSize: grain === "week" ? 10 : 11 }}
          interval={0}
          angle={grain === "week" ? -20 : 0}
          textAnchor={grain === "week" ? "end" : "middle"}
          height={grain === "week" ? 48 : 30}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: colors.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: 8,
            color: colors.tooltipText,
          }}
          labelFormatter={(label) =>
            grain === "week" ? `${t.sparepart.groupedByWeek}: ${label}` : String(label)
          }
        />
        <Legend wrapperStyle={{ fontSize: 11, color: colors.axis }} />
        <Bar
          dataKey="inQty"
          name={t.sparepart.incoming}
          fill={TYPE_COLORS.in}
          radius={[3, 3, 0, 0]}
        />
        <Bar
          dataKey="outQty"
          name={t.sparepart.outgoing}
          fill={TYPE_COLORS.out}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLines({
  rows,
  visible,
  categories,
}: {
  rows: SparepartOverviewTrendPoint[];
  visible: SparepartCategoryCode[];
  categories: SparepartOverviewCategoryTab[];
}) {
  const { lang } = useLang();
  const colors = useChartTheme();
  const data = rows.map((row) => ({
    ...row,
    label: formatPeriodLabel(row.date, lang),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid stroke={colors.grid} vertical={false} strokeDasharray="4 4" />
        <XAxis
          dataKey="label"
          tick={{ fill: colors.axis, fontSize: 10 }}
          interval={rows.length > 20 ? 4 : 0}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: colors.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: 8,
            color: colors.tooltipText,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: colors.axis }} />
        {visible.map((code) => (
          <Line
            key={code}
            type="monotone"
            dataKey={code}
            name={localizedCategoryLabel(code, categories, lang)}
            stroke={categoryColor(code)}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ points }: { points: { date: string; qty: number }[] }) {
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points}>
          <Area
            type="monotone"
            dataKey="qty"
            stroke="#6366f1"
            fill="#6366f133"
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
