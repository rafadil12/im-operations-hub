"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { localizedName, useLang } from "@/lib/i18n";
import {
  SPAREPART_CATEGORY_COLORS,
  type SparepartCategoryCode,
} from "@/lib/sparepartCategories";
import type {
  SparepartOverviewByCategory,
  SparepartOverviewCalendarCell,
  SparepartOverviewHeatmapCell,
  SparepartOverviewLocationStock,
  SparepartOverviewMonthlyBar,
  SparepartOverviewTrendPoint,
  SparepartOverviewTypeSlice,
} from "@/lib/sparepartOverview";
import { CHART_COLORS, useTheme } from "@/lib/theme";

const TYPE_COLORS = {
  in: "#22c55e",
  out: "#ef4444",
  transfer: "#3b82f6",
  reversal: "#94a3b8",
};

function useChartTheme() {
  const { theme } = useTheme();
  return CHART_COLORS[theme];
}

function formatMonth(month: string, lang: string): string {
  const [y, m] = month.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(lang === "cn" ? "zh-CN" : "en-US", {
    month: "short",
  });
}

function formatPeriodLabel(key: string, lang: string): string {
  if (/^\d{4}-\d{2}$/.test(key)) return formatMonth(key, lang);
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const d = new Date(`${key}T00:00:00`);
    return d.toLocaleDateString(lang === "cn" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
    });
  }
  return key;
}

type DonutProps = {
  slices: { name: string; value: number; color: string }[];
  centerValue: string;
  centerLabel: string;
};

export function CategoryDonut({
  rows,
}: {
  rows: SparepartOverviewByCategory[];
}) {
  const { lang } = useLang();
  const slices = rows.map((row) => ({
    name: localizedName(
      { name_en: row.name_en, name_cn: row.name_cn },
      lang,
    ),
    value: row.currentStock,
    color:
      SPAREPART_CATEGORY_COLORS[row.code as SparepartCategoryCode] ?? "#64748b",
  }));
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <Donut
      slices={slices}
      centerValue={total.toLocaleString()}
      centerLabel={lang === "cn" ? "件" : "pcs"}
    />
  );
}

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
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: slice.color }}
              />
              <span className="truncate text-text-muted">{slice.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-text">
              {slice.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TypeDonut({
  slices,
}: {
  slices: SparepartOverviewTypeSlice[];
}) {
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
    <Donut
      slices={mapped}
      centerValue={total.toLocaleString()}
      centerLabel={t.sparepart.pcs}
    />
  );
}

export function InOutBars({ rows }: { rows: SparepartOverviewMonthlyBar[] }) {
  const { t, lang } = useLang();
  const colors = useChartTheme();
  const data = rows.map((row) => ({
    ...row,
    label: formatPeriodLabel(row.month, lang),
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid stroke={colors.grid} vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="label" tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          contentStyle={{
            background: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: 8,
            color: colors.tooltipText,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: colors.axis }} />
        <Bar dataKey="inQty" name={t.sparepart.incoming} fill={TYPE_COLORS.in} radius={[3, 3, 0, 0]} />
        <Bar dataKey="outQty" name={t.sparepart.outgoing} fill={TYPE_COLORS.out} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLines({
  rows,
  visible,
}: {
  rows: SparepartOverviewTrendPoint[];
  visible: SparepartCategoryCode[];
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
        <XAxis dataKey="label" tick={{ fill: colors.axis, fontSize: 10 }} interval={rows.length > 20 ? 4 : 0} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
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
            name={code}
            stroke={SPAREPART_CATEGORY_COLORS[code]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function LocationBars({
  rows,
}: {
  rows: SparepartOverviewLocationStock[];
}) {
  const colors = useChartTheme();
  const data = rows.slice(0, 8);

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid stroke={colors.grid} horizontal={false} strokeDasharray="4 4" />
        <XAxis type="number" tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fill: colors.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: 8,
            color: colors.tooltipText,
          }}
        />
        <Bar dataKey="qty" fill="#6366f1" radius={[0, 3, 3, 0]} />
      </BarChart>
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

export function CategoryLocationHeatmap({
  cells,
}: {
  cells: SparepartOverviewHeatmapCell[];
}) {
  const locations = Array.from(
    new Map(cells.map((c) => [c.locationId, c.locationName])).entries(),
  );
  const categories = Array.from(new Set(cells.map((c) => c.categoryCode)));
  const max = Math.max(1, ...cells.map((c) => c.qty));
  const lookup = new Map(
    cells.map((c) => [`${c.categoryCode}|${c.locationId}`, c.qty]),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="px-2 py-1.5 text-left font-semibold text-text-dim"> </th>
            {locations.map(([id, name]) => (
              <th key={id} className="px-2 py-1.5 text-center font-semibold text-text-dim">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((code) => (
            <tr key={code}>
              <td className="px-2 py-1.5 font-medium text-text">{code}</td>
              {locations.map(([id]) => {
                const qty = lookup.get(`${code}|${id}`) ?? 0;
                const t = qty / max;
                const bg = `rgba(99, 102, 241, ${0.08 + t * 0.7})`;
                return (
                  <td
                    key={id}
                    className="px-2 py-1.5 text-center tabular-nums text-text"
                    style={{ background: qty ? bg : undefined }}
                  >
                    {qty.toLocaleString()}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MovementCalendar({
  cells,
}: {
  cells: SparepartOverviewCalendarCell[];
}) {
  const { lang } = useLang();
  const max = Math.max(1, ...cells.map((c) => c.qty));
  const first = cells[0]?.date;
  if (!first) return null;
  const start = new Date(`${first}T00:00:00`);
  const pad = start.getDay();
  const padded: (SparepartOverviewCalendarCell | null)[] = [
    ...Array.from({ length: pad }, () => null),
    ...cells,
  ];
  const weeks: (SparepartOverviewCalendarCell | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  const dow =
    lang === "cn"
      ? ["日", "一", "二", "三", "四", "五", "六"]
      : ["S", "M", "T", "W", "T", "F", "S"];

  const colorFor = (qty: number) => {
    if (qty <= 0) return "bg-border-subtle/40";
    const t = qty / max;
    if (t < 0.25) return "bg-emerald-500/30";
    if (t < 0.5) return "bg-lime-500/50";
    if (t < 0.75) return "bg-amber-500/60";
    return "bg-red-500/70";
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-text-dim">
        {dow.map((d, i) => (
          <div key={`${d}-${i}`}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((cell, di) =>
            cell ? (
              <div
                key={cell.date}
                title={`${cell.date}: ${cell.qty}`}
                className={`flex aspect-square items-center justify-center rounded text-[10px] tabular-nums text-text ${colorFor(cell.qty)}`}
              >
                {Number(cell.date.slice(8))}
              </div>
            ) : (
              <div key={`e-${wi}-${di}`} />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
