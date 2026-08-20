"use client";

import type { ReactNode } from "react";
import { localizedName, useLang } from "@/lib/i18n";
import {
  categoryColor,
  normalizeCategoryCode,
  SPAREPART_CATEGORY_CODES,
  type SparepartCategoryCode,
} from "@/lib/sparepartCategories";
import {
  overviewMatchesFilters,
  type SparepartOverviewData,
} from "@/lib/sparepartOverview";
import {
  CategoryDonut,
  CategoryLocationHeatmap,
  InOutBars,
  LocationBars,
  MovementCalendar,
  Sparkline,
  TrendLines,
  TypeDonut,
} from "./OverviewCharts";

type Props = {
  data: SparepartOverviewData;
  category: string | null;
  range: { start: string; end: string };
  onCategoryChange: (code: string | null) => void;
  draftRange: { start: string; end: string };
  onDraftRangeChange: (range: { start: string; end: string }) => void;
  onApplyRange: () => void;
};

const dateCtrl =
  "cursor-pointer rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";

const panel = "rounded-lg border border-border-subtle bg-surface p-4";
const titleCls = "mb-3 text-sm font-semibold text-text";

function formatPct(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function pctTone(value: number | null, invert = false): string {
  if (value == null || value === 0) return "text-text-dim";
  const up = value > 0;
  const good = invert ? !up : up;
  return good ? "text-emerald-500" : "text-danger";
}

export function SparepartOverview({
  data,
  category,
  range,
  onCategoryChange,
  draftRange,
  onDraftRangeChange,
  onApplyRange,
}: Props) {
  const { t, lang } = useLang();
  const ready = overviewMatchesFilters(data, category, range);
  const visibleCodes = (
    category
      ? [normalizeCategoryCode(category) ?? category]
      : SPAREPART_CATEGORY_CODES
  ) as SparepartCategoryCode[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onCategoryChange(null)}
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold",
              !category
                ? "bg-accent text-white"
                : "bg-surface-hover text-text-muted hover:text-text",
            ].join(" ")}
          >
            {t.common.all}
          </button>
          {data.categories.map((tab) => {
            const tabCode = normalizeCategoryCode(tab.code) ?? tab.code;
            const active = category === tabCode;
            return (
              <button
                key={tabCode}
                type="button"
                onClick={() => onCategoryChange(tabCode)}
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  active ? "text-white" : "bg-surface-hover text-text-muted hover:text-text",
                ].join(" ")}
                style={active ? { background: categoryColor(tabCode) } : undefined}
              >
                {localizedName(tab, lang)}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className={dateCtrl}
            value={draftRange.start}
            onChange={(e) =>
              onDraftRangeChange({ ...draftRange, start: e.target.value })
            }
          />
          <span className="text-xs text-text-dim">–</span>
          <input
            type="date"
            className={dateCtrl}
            value={draftRange.end}
            onChange={(e) =>
              onDraftRangeChange({ ...draftRange, end: e.target.value })
            }
          />
          <button
            type="button"
            onClick={onApplyRange}
            className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            {t.common.apply}
          </button>
        </div>
      </div>

      {!ready ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
          {t.common.loading}
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon="inventory"
          label={t.sparepart.kpiTotalInventory}
          hint={t.sparepart.kpiTotalInventoryHint}
          value={data.kpi.totalItems.toLocaleString()}
        />
        <KpiCard
          icon="stock"
          label={t.sparepart.kpiTotalStock}
          hint={t.sparepart.kpiTotalStockHint}
          value={`${data.kpi.totalStock.toLocaleString()} ${t.sparepart.qty}`}
          change={data.kpi.totalStockMomPct}
          spark={data.kpi.sparkline}
        />
        <KpiCard
          icon="alert"
          label={t.sparepart.kpiLowStock}
          hint={t.sparepart.kpiLowStockHint}
          value={data.kpi.lowStockCount.toLocaleString()}
          change={data.kpi.lowStockMomPct}
          invert
        />
        <KpiCard
          icon="movement"
          label={t.sparepart.kpiMovement}
          hint={t.sparepart.kpiMovementHint}
          value={`${data.kpi.movementQty.toLocaleString()} ${t.sparepart.qty}`}
          change={data.kpi.movementMomPct}
          spark={data.kpi.sparkline}
        />
        <KpiCard
          icon="location"
          label={t.sparepart.kpiActiveLocations}
          hint={t.sparepart.kpiActiveLocationsHint}
          value={data.kpi.activeLocations.toLocaleString()}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className={panel}>
          <h2 className={titleCls}>{t.sparepart.stockByCategory}</h2>
          <CategoryDonut rows={data.byCategory} />
        </section>
        <section className={`${panel} xl:col-span-2`}>
          <h2 className={titleCls}>{t.sparepart.keyFiguresByCategory}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-dim">
                  <th className="pb-2 font-semibold">{t.sparepart.category}</th>
                  <th className="pb-2 text-right font-semibold">{t.sparepart.totalItems}</th>
                  <th className="pb-2 text-right font-semibold">{t.sparepart.stockCurrent}</th>
                  <th className="pb-2 text-right font-semibold">{t.sparepart.kpiLowStock}</th>
                  <th className="pb-2 text-right font-semibold">{t.sparepart.kpiMovement}</th>
                  <th className="pb-2 text-right font-semibold">{t.sparepart.netMovement}</th>
                </tr>
              </thead>
              <tbody>
                {data.byCategory.map((row) => (
                  <tr key={row.code} className="border-t border-border-subtle/60">
                    <td className="py-2 font-medium text-text">
                      <span
                        className="mr-2 inline-block size-2 rounded-full"
                        style={{ background: categoryColor(row.code) }}
                      />
                      {localizedName(
                        { name_en: row.name_en, name_cn: row.name_cn },
                        lang,
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">{row.totalItems}</td>
                    <td className="py-2 text-right tabular-nums">
                      {row.currentStock.toLocaleString()}
                    </td>
                    <td className="py-2 text-right tabular-nums">{row.lowStock}</td>
                    <td className="py-2 text-right tabular-nums">
                      {row.movementQty.toLocaleString()}
                    </td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        row.netMovement > 0
                          ? "text-emerald-500"
                          : row.netMovement < 0
                            ? "text-danger"
                            : "text-text-muted"
                      }`}
                    >
                      {row.netMovement > 0 ? "+" : ""}
                      {row.netMovement.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className={`${panel} xl:col-span-2`}>
          <h2 className={titleCls}>{t.sparepart.movementSummary}</h2>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat
              label={t.sparepart.incoming}
              value={data.movementSummary.inQty}
              hint={`${data.movementSummary.inDocs} ${t.sparepart.documentsCount}`}
            />
            <MiniStat
              label={t.sparepart.outgoing}
              value={data.movementSummary.outQty}
              hint={`${data.movementSummary.outDocs} ${t.sparepart.documentsCount}`}
            />
            <MiniStat
              label={t.sparepart.netMovement}
              value={data.movementSummary.netQty}
            />
            <MiniStat
              label={t.sparepart.transactionCount}
              value={data.movementSummary.transactionCount}
            />
          </div>
          <InOutBars rows={data.movementSummary.monthly} />
        </section>
        <section className={panel}>
          <h2 className={titleCls}>{t.sparepart.movementTypeDistribution}</h2>
          <TypeDonut slices={data.movementByType} />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className={panel}>
          <h2 className={titleCls}>{t.sparepart.movementTrend}</h2>
          <TrendLines rows={data.trendDaily} visible={visibleCodes} />
        </section>
        <section className={panel}>
          <h2 className={titleCls}>{t.sparepart.stockByLocation}</h2>
          {data.stockByLocation.length ? (
            <LocationBars rows={data.stockByLocation} />
          ) : (
            <p className="text-sm text-text-muted">{t.common.noData}</p>
          )}
        </section>
      </div>

      <section className={panel}>
        <h2 className={titleCls}>{t.sparepart.categoryLocationHeatmap}</h2>
        <CategoryLocationHeatmap cells={data.categoryLocationHeatmap} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className={panel}>
          <h2 className={titleCls}>
            {t.sparepart.topStockItems}{" "}
            <span className="text-xs font-normal text-text-muted">
              {t.sparepart.topStockSubtitle}
            </span>
          </h2>
          <ul className="max-h-[280px] space-y-2 overflow-y-auto">
            {data.topStock.length === 0 ? (
              <li className="text-sm text-text-muted">{t.common.noData}</li>
            ) : (
              data.topStock.map((item) => (
                <li
                  key={item.code}
                  className="flex items-start justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-text">{item.code}</p>
                    <p className="truncate text-text-muted">
                      {localizedName(item, lang)} · {item.category_code}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase bg-danger/15 text-danger">
                    {t.sparepart.statusCritical}
                  </span>
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-text-muted">
              Total {data.topStock.length} Items
            </span>
            <a
              href="/sparepart/stock"
              className="font-medium text-primary hover:underline"
            >
              {t.sparepart.viewAll}
            </a>
          </div>
        </section>
        <section className={panel}>
          <h2 className={titleCls}>
            {t.sparepart.lowStockPriority}{" "}
            <span className="text-xs font-normal text-text-muted">
              {t.sparepart.lowStockSubtitle}
            </span>
          </h2>
          <ul className="max-h-[280px] space-y-2 overflow-y-auto">
            {data.lowStockItems.filter((item) => item.status === "low").length === 0 ? (
              <li className="text-sm text-text-muted">{t.common.noData}</li>
            ) : (
              data.lowStockItems
                .filter((item) => item.status === "low")
                .map((item) => (
                  <li
                    key={item.code}
                    className="flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text">{item.code}</p>
                      <p className="truncate text-text-muted">
                        {localizedName(item, lang)} · {item.stock_current}/
                        {item.min_stock}
                        {item.uom_code ? ` ${item.uom_code}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase bg-warning/15 text-warning">
                      {t.sparepart.statusLow}
                    </span>
                  </li>
                ))
            )}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-text-muted">
              Total {data.lowStockItems.filter((item) => item.status === "low").length} Items
            </span>
            <a
              href="/sparepart/stock"
              className="font-medium text-primary hover:underline"
            >
              {t.sparepart.viewAll}
            </a>
          </div>
        </section>
        <section className={panel}>
          <MovementCalendar
            cells={data.movementHeatmap}
            categoryLabel={
              category
                ? localizedName(
                    data.categories.find((tab) => tab.code === category) ?? {
                      name_en: category,
                      name_cn: category,
                    },
                    lang,
                  )
                : t.sparepart.allCategory
            }
          />
        </section>
      </div>

      {data.sparseItems.length > 0 ? (
        <section className={panel}>
          <h2 className={titleCls}>{t.sparepart.specialItems}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.sparseItems.map((item) => (
              <li
                key={item.code}
                className="rounded-md border border-border-subtle bg-bg/40 p-3 text-xs"
              >
                <p className="font-semibold text-text">{item.code}</p>
                <p className="text-text-muted">{localizedName(item, lang)}</p>
                <p className="mt-1 tabular-nums text-text">
                  {item.stock_current} / {item.min_stock}
                  {item.uom_code ? ` ${item.uom_code}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
        </>
      )}
    </div>
  );
}

const kpiIconMeta = {
  inventory: { color: "#2563eb", bg: "#2563eb22" },
  stock: { color: "#16a34a", bg: "#16a34a22" },
  alert: { color: "#ea580c", bg: "#ea580c22" },
  movement: { color: "#0ea5e9", bg: "#0ea5e922" },
  location: { color: "#7c3aed", bg: "#7c3aed22" },
} as const;

type KpiIconType = keyof typeof kpiIconMeta;

function KpiIcon({ type }: { type: KpiIconType }) {
  const meta = kpiIconMeta[type];
  const icon: Record<KpiIconType, ReactNode> = {
    inventory: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.3 7 12 12l8.7-5M12 22V12" />
      </svg>
    ),
    stock: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="13" width="4" height="8" rx="1" />
        <rect x="10" y="8" width="4" height="13" rx="1" />
        <rect x="17" y="3" width="4" height="18" rx="1" />
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    ),
    movement: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8H3M7 4 3 8l4 4" />
        <path d="M7 16h14M17 12l4 4-4 4" />
      </svg>
    ),
    location: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  };

  return (
    <span
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: meta.bg, color: meta.color }}
      aria-hidden
    >
      {icon[type]}
    </span>
  );
}

function KpiCard({
  icon,
  label,
  hint,
  value,
  change,
  invert = false,
  spark,
}: {
  icon: KpiIconType;
  label: string;
  hint: string;
  value: string;
  change?: number | null;
  invert?: boolean;
  spark?: { date: string; qty: number }[];
}) {
  const { t } = useLang();
  return (
    <div className={panel}>
      <div className="flex items-center gap-2.5">
        <KpiIcon type={icon} />
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-text">
            {label}
          </p>
          <p className="truncate text-[10px] uppercase tracking-wide text-text-dim">
            {hint}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xl font-semibold text-text">{value}</p>
      {change !== undefined ? (
        <p className={`mt-1 text-[11px] ${pctTone(change ?? null, invert)}`}>
          {formatPct(change ?? null)} {t.sparepart.vsPreviousPeriod}
        </p>
      ) : null}
      {spark ? <div className="mt-2"><Sparkline points={spark} /></div> : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-md bg-bg/50 px-3 py-2">
      <p className="text-[10px] uppercase text-text-dim">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-text">
        {value.toLocaleString()}
      </p>
      {hint ? <p className="text-[10px] text-text-muted">{hint}</p> : null}
    </div>
  );
}
