"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import type { SparepartOverviewCalendarCell } from "@/lib/sparepart/overview";

const HEATMAP_TICK_DAYS = [1, 5, 10, 15, 20, 25];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function monthKeysFromCells(cells: SparepartOverviewCalendarCell[]): string[] {
  return Array.from(new Set(cells.map((c) => c.date.slice(0, 7)))).sort();
}

type HeatCell = SparepartOverviewCalendarCell | null;

function buildMonthWeeks(monthKey: string, qtyByDate: Map<string, number>): HeatCell[][] {
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

function weekTickLabels(monthKey: string, weekCount: number, locale: string): (string | null)[] {
  const [y, m] = monthKey.split("-").map(Number);
  const lastDate = new Date(y, m, 0).getDate();
  const mondayPad = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const ticks = [...HEATMAP_TICK_DAYS.filter((day) => day < lastDate), lastDate];
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

  const qtyByDate = useMemo(() => new Map(cells.map((c) => [c.date, c.qty])), [cells]);
  const weeks = activeMonth ? buildMonthWeeks(activeMonth, qtyByDate) : [];
  const ticks = activeMonth ? weekTickLabels(activeMonth, weeks.length, locale) : [];
  const max = Math.max(
    1,
    ...cells.filter((c) => (activeMonth ? c.date.startsWith(activeMonth) : false)).map((c) => c.qty)
  );
  const dow = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" })
  );
  const monthLabel = activeMonth
    ? new Date(
        Number(activeMonth.slice(0, 4)),
        Number(activeMonth.slice(5, 7)) - 1,
        1
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
            <div key={`tick-${i}`} className="relative h-4 overflow-visible">
              {label ? (
                <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap px-1 text-[11px] leading-4 tracking-wide text-text-dim">
                  {label}
                </span>
              ) : null}
            </div>
          ))}
          {dow.map((day, row) => (
            <div key={day} className="contents">
              <div className="flex items-center text-[12px] leading-none text-text-dim">{day}</div>
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
