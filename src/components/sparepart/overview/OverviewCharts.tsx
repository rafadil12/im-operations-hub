"use client";

import { useMemo, useState } from "react";
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
  categoryColor,
  localizedCategoryLabel,
  type SparepartCategoryCode,
} from "@/lib/sparepartCategories";
import type {
  SparepartOverviewBarGrain,
  SparepartOverviewByCategory,
  SparepartOverviewCalendarCell,
  SparepartOverviewCategoryTab,
  SparepartOverviewHeatmapCell,
  SparepartOverviewLocationStock,
  SparepartOverviewMonthlyBar,
  SparepartOverviewTopUsedItem,
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

function formatDayLabel(iso: string, lang: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(lang === "cn" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Week buckets are Monday-start ISO dates; show the full Mon–Sun range. */
function formatWeekRangeLabel(startIso: string, lang: string): string {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const locale = lang === "cn" ? "zh-CN" : "en-US";
  const startLabel = start.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
  const endLabel =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
      ? end.toLocaleDateString(locale, { day: "numeric" })
      : end.toLocaleDateString(locale, { month: "short", day: "numeric" });
  return `${startLabel}–${endLabel}`;
}

function formatPeriodLabel(
  key: string,
  lang: string,
  grain: SparepartOverviewBarGrain = "day",
): string {
  if (grain === "month" || /^\d{4}-\d{2}$/.test(key)) return formatMonth(key, lang);
  if (grain === "week" && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return formatWeekRangeLabel(key, lang);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return formatDayLabel(key, lang);
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
  const { t, lang } = useLang();
  const slices = rows.map((row) => ({
    name: localizedName(
      { name_en: row.name_en, name_cn: row.name_cn },
      lang,
    ),
    value: row.currentStock,
    color: categoryColor(row.code),
  }));
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <Donut
      slices={slices}
      centerValue={total.toLocaleString()}
      centerLabel={t.sparepart.qty}
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
      centerLabel={t.sparepart.qty}
    />
  );
}

export function TopUsedList({
  items,
  categories,
}: {
  items: SparepartOverviewTopUsedItem[];
  categories: SparepartOverviewCategoryTab[];
}) {
  const { t, lang } = useLang();
  const rankTone = [
    {
      badge: "bg-[#3b82f6]/12 text-[#2563eb] ring-1 ring-[#3b82f6]/20",
    },
    {
      badge: "bg-[#8b5cf6]/12 text-[#7c3aed] ring-1 ring-[#8b5cf6]/20",
    },
    {
      badge: "bg-[#14b8a6]/12 text-[#0f766e] ring-1 ring-[#14b8a6]/20",
    },
    {
      badge: "bg-[#f59e0b]/12 text-[#d97706] ring-1 ring-[#f59e0b]/20",
    },
    {
      badge: "bg-[#64748b]/12 text-[#475569] ring-1 ring-[#64748b]/20",
    },
  ] as const;

  if (items.length === 0) {
    return <p className="text-sm text-text-muted">{t.common.noData}</p>;
  }

  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <div
          key={item.code}
          className="rounded-xl border border-border-subtle bg-bg/30 p-3 shadow-[0_8px_24px_var(--shadow-color-soft)]"
        >
          <div className="flex items-start gap-3">
            <span
              className={[
                "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                rankTone[index]?.badge ?? rankTone[4].badge,
              ].join(" ")}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">{item.code}</p>
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    {localizedName(item, lang)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-accent">
                  {item.qty.toLocaleString()}
                  {item.uom_code
                    ? ` ${
                        item.uom_code.toUpperCase() === "PCS"
                          ? t.sparepart.pcs
                          : item.uom_code
                      }`
                    : ` ${t.sparepart.qty}`}
                </span>
              </div>

              <div className="mt-2 text-[11px] tracking-wide text-text-dim">
                {localizedCategoryLabel(
                  item.category_code,
                  categories,
                  lang,
                  {
                    name_en: item.category_name_en,
                    name_cn: item.category_name_cn,
                  },
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

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
        <YAxis tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
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
        <Bar dataKey="inQty" name={t.sparepart.incoming} fill={TYPE_COLORS.in} radius={[3, 3, 0, 0]} />
        <Bar dataKey="outQty" name={t.sparepart.outgoing} fill={TYPE_COLORS.out} radius={[3, 3, 0, 0]} />
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

export function LocationBars({
  rows,
}: {
  rows: SparepartOverviewLocationStock[];
}) {
  const { t, lang } = useLang();
  const data = rows.slice(0, 5);
  const max = Math.max(1, ...data.map((row) => row.qty));
  const total = data.reduce((sum, row) => sum + row.qty, 0);

  if (data.length === 0) {
    return <p className="text-sm text-text-muted">{t.common.noData}</p>;
  }

  return (
    <div className="space-y-2.5">
      {data.map((row) => {
        const pctOfTotal = total > 0 ? Math.round((row.qty / total) * 100) : 0;
        const displayName = localizedName(
          {
            name_en: row.name_en ?? row.name,
            name_cn: row.name_cn ?? null,
          },
          lang,
        );
        return (
          <div
            key={`${row.locationId}-${row.code}`}
            className="rounded-md border border-border-subtle/80 bg-bg/10 px-3 py-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-text">
                    {displayName}
                  </p>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-text">
                    {row.qty.toLocaleString()}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-3 text-[11px] text-text-dim">
                  <span>{pctOfTotal}%</span>
                  <span>{row.code}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border-subtle/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6]"
                    style={{ width: `${(row.qty / max) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
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
  categories,
}: {
  cells: SparepartOverviewHeatmapCell[];
  categories: SparepartOverviewCategoryTab[];
}) {
  const { lang } = useLang();
  const locations = Array.from(
    new Map(
      cells.map((c) => [
        c.locationId,
        localizedName(
          {
            name_en: c.locationNameEn ?? c.locationName,
            name_cn: c.locationNameCn ?? null,
          },
          lang,
        ),
      ]),
    ).entries(),
  );
  const categoryCodes = Array.from(new Set(cells.map((c) => c.categoryCode)));
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
          {categoryCodes.map((code) => (
            <tr key={code}>
              <td className="px-2 py-1.5 font-medium text-text">
                {localizedCategoryLabel(code, categories, lang)}
              </td>
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

const HEATMAP_TICK_DAYS = [1, 5, 10, 15, 20, 25];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function monthKeysFromCells(cells: SparepartOverviewCalendarCell[]): string[] {
  return Array.from(new Set(cells.map((c) => c.date.slice(0, 7)))).sort();
}

type HeatCell = SparepartOverviewCalendarCell | null;

function buildMonthWeeks(
  monthKey: string,
  qtyByDate: Map<string, number>,
): HeatCell[][] {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const lastDate = new Date(y, m, 0).getDate();
  const mondayPad = (first.getDay() + 6) % 7;
  const days: HeatCell[] = Array.from({ length: mondayPad }, () => null);
  for (let d = 1; d <= lastDate; d++) {
    const date = `${y}-${pad2(m)}-${pad2(d)}`;
    days.push({ date, qty: qtyByDate.get(date) ?? 0 });
  }
  while (days.length % 7 !== 0) days.push(null);
  const weeks: HeatCell[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function weekTickLabels(
  monthKey: string,
  weekCount: number,
  locale: string,
): (string | null)[] {
  const [y, m] = monthKey.split("-").map(Number);
  const lastDate = new Date(y, m, 0).getDate();
  const mondayPad = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const ticks = [
    ...HEATMAP_TICK_DAYS.filter((day) => day < lastDate),
    lastDate,
  ];
  const labels: (string | null)[] = Array.from({ length: weekCount }, () => null);
  for (const day of ticks) {
    const col = Math.floor((mondayPad + day - 1) / 7);
    if (col < 0 || col >= weekCount || labels[col]) continue;
    labels[col] = new Date(y, m - 1, day).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
  }
  return labels;
}

function heatmapColor(qty: number, max: number): string {
  if (qty <= 0) return "bg-border-subtle/40";
  const t = qty / max;
  if (t < 0.25) return "bg-emerald-500/40";
  if (t < 0.5) return "bg-lime-400/70";
  if (t < 0.75) return "bg-amber-500/80";
  return "bg-red-500/80";
}

export function MovementCalendar({
  cells,
  categoryLabel,
}: {
  cells: SparepartOverviewCalendarCell[];
  categoryLabel: string;
}) {
  const { t, lang } = useLang();
  const locale = lang === "cn" ? "zh-CN" : "en-US";
  const monthKeys = useMemo(() => monthKeysFromCells(cells), [cells]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const activeMonth =
    selectedMonth && monthKeys.includes(selectedMonth)
      ? selectedMonth
      : (monthKeys[monthKeys.length - 1] ?? null);
  const monthIndex = activeMonth ? monthKeys.indexOf(activeMonth) : -1;
  const canPrev = monthIndex > 0;
  const canNext = monthIndex >= 0 && monthIndex < monthKeys.length - 1;

  const qtyByDate = useMemo(
    () => new Map(cells.map((c) => [c.date, c.qty])),
    [cells],
  );
  const weeks = activeMonth ? buildMonthWeeks(activeMonth, qtyByDate) : [];
  const ticks = activeMonth
    ? weekTickLabels(activeMonth, weeks.length, locale)
    : [];
  const max = Math.max(
    1,
    ...cells
      .filter((c) => (activeMonth ? c.date.startsWith(activeMonth) : false))
      .map((c) => c.qty),
  );
  const dow = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" }),
  );
  const monthLabel = activeMonth
    ? new Date(
        Number(activeMonth.slice(0, 4)),
        Number(activeMonth.slice(5, 7)) - 1,
        1,
      ).toLocaleDateString(locale, { month: "long", year: "numeric" })
    : "—";

  const pagerBtn =
    "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-text hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 text-sm font-semibold text-text">
          {t.sparepart.movementHeatmap}{" "}
          <span className="font-medium text-text-muted">({categoryLabel})</span>
        </h2>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className={pagerBtn}
            aria-label={t.common.previous}
            disabled={!canPrev}
            onClick={() => setSelectedMonth(monthKeys[monthIndex - 1] ?? null)}
          >
            <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden>
              <path
                d="M10 3 5 8l5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="min-w-[6.5rem] text-center text-xs font-medium tabular-nums text-text">
            {monthLabel}
          </span>
          <button
            type="button"
            className={pagerBtn}
            aria-label={t.common.next}
            disabled={!canNext}
            onClick={() => setSelectedMonth(monthKeys[monthIndex + 1] ?? null)}
          >
            <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden>
              <path
                d="M6 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {weeks.length === 0 ? (
        <p className="text-sm text-text-muted">{t.common.noData}</p>
      ) : (
        <div
          className="grid w-fit gap-x-0 gap-y-2"
          style={{
            gridTemplateColumns: `4rem repeat(${weeks.length}, 52px)`,
          }}
        >
          <div />
          {ticks.map((label, i) => (
            <div
              key={`tick-${i}`}
              className="relative h-4 overflow-visible"
            >
              {label ? (
                <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap px-1 text-[11px] leading-4 tracking-wide text-text-dim">
                  {label}
                </span>
              ) : null}
            </div>
          ))}
          {dow.map((day, row) => (
            <div key={day} className="contents">
              <div className="flex items-center text-[12px] leading-none text-text-dim">
                {day}
              </div>
              {weeks.map((week, col) => {
                const cell = week[row] ?? null;
                if (!cell) {
                  return <div key={`e-${row}-${col}`} />;
                }
                return (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${cell.qty}`}
                    className={`mx-auto size-[24px] rounded-[2px] ${heatmapColor(cell.qty, max)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 text-[10px] text-text">
        <span className="size-2.5 shrink-0 rounded-[3px] bg-emerald-500/50" />
        <span>{t.sparepart.heatmapLow}</span>
        <span className="h-px min-w-0 flex-1 border-t border-dashed border-border" />
        <span className="size-2.5 shrink-0 rounded-[3px] bg-red-500/80" />
        <span>{t.sparepart.heatmapHigh}</span>
      </div>
    </div>
  );
}
