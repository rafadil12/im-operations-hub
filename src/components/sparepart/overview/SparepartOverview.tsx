"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { localizedName, useLang } from "@/lib/i18n";
import {
  categoryColor,
  localizedCategoryLabel,
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
  TopUsedList,
  TrendLines,
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
  const router = useRouter();
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

      <section className={panel}>
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <section className={panel}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-text">
                {t.sparepart.movementSummary}{" "}
                <span className="text-xs font-normal text-text-muted">
                  {data.movementSummary.barGrain === "week"
                    ? t.sparepart.groupedByWeek
                    : data.movementSummary.barGrain === "month"
                      ? t.sparepart.groupedByMonth
                      : t.sparepart.groupedByDay}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => router.push("/sparepart/documents")}
                className="shrink-0 cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                {t.dashboard.viewDetail}
              </button>
            </div>
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
            <InOutBars
              rows={data.movementSummary.monthly}
              grain={data.movementSummary.barGrain}
            />
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

        <div className="space-y-4">
          <section className={panel}>
            <h2 className={titleCls}>{t.sparepart.topUsedItems}</h2>
            <TopUsedList
              items={data.topUsedItems}
              categories={data.categories}
            />
          </section>

          <section className={panel}>
            <h2 className={titleCls}>{t.sparepart.stockByCategory}</h2>
            <CategoryDonut rows={data.byCategory} />
          </section>
        </div>
      </div>

      <section className={panel}>
        <h2 className={titleCls}>{t.sparepart.movementTrend}</h2>
        <TrendLines
          rows={data.trendDaily}
          visible={visibleCodes}
          categories={data.categories}
        />
      </section>

      <section className={panel}>
        <h2 className={titleCls}>{t.sparepart.categoryLocationHeatmap}</h2>
        <CategoryLocationHeatmap
          cells={data.categoryLocationHeatmap}
          categories={data.categories}
        />
      </section>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3">
        <AlertItemsCard
          title={t.sparepart.topStockItems}
          subtitle={t.sparepart.topStockSubtitle}
          items={data.topStock}
          categories={data.categories}
          renderMeta={(item) =>
            `${localizedName(item, lang)} · ${localizedCategoryLabel(
              item.category_code,
              data.categories,
              lang,
              {
                name_en: item.category_name_en,
                name_cn: item.category_name_cn,
              },
            )}`
          }
          badgeClass="bg-danger/15 text-danger"
          badgeLabel={t.sparepart.statusCritical}
        />
        <AlertItemsCard
          title={t.sparepart.lowStockPriority}
          subtitle={t.sparepart.lowStockSubtitle}
          items={data.lowStockItems.filter((item) => item.status === "low")}
          categories={data.categories}
          renderMeta={(item) => {
            const uom =
              item.uom_code && item.uom_code.toUpperCase() === "PCS"
                ? t.sparepart.pcs
                : item.uom_code;
            return `${localizedName(item, lang)} · ${item.stock_current}/${item.min_stock}${
              uom ? ` ${uom}` : ""
            }`;
          }}
          badgeClass="bg-warning/15 text-warning"
          badgeLabel={t.sparepart.statusLow}
        />
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

const PREVIEW_ROWS = 7;
const LIST_HEIGHT = "h-[280px]";

type AlertItem = {
  code: string;
  name_en: string | null;
  name_cn: string | null;
  category_code: string;
  category_name_en?: string | null;
  category_name_cn?: string | null;
  uom_code?: string | null;
  stock_current: number;
  min_stock?: number;
};

function AlertItemsCard({
  title,
  subtitle,
  items,
  categories,
  renderMeta,
  badgeClass,
  badgeLabel,
}: {
  title: string;
  subtitle: string;
  items: AlertItem[];
  categories: SparepartOverviewData["categories"];
  renderMeta: (item: AlertItem) => string;
  badgeClass: string;
  badgeLabel: string;
}) {
  const { t } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const preview = items.slice(0, PREVIEW_ROWS);
  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      const haystacks = [
        item.code,
        item.name_en ?? "",
        item.name_cn ?? "",
        item.category_code,
        item.category_name_en ?? "",
        item.category_name_cn ?? "",
        renderMeta(item),
      ];
      return haystacks.some((value) => value.toLowerCase().includes(needle));
    });
  }, [items, query, renderMeta]);

  return (
    <>
      <section className={`${panel} flex flex-col`}>
        <h2 className={titleCls}>
          {title}{" "}
          <span className="text-xs font-normal text-text-muted">{subtitle}</span>
        </h2>
        <ul className={`${LIST_HEIGHT} space-y-2 overflow-y-auto`}>
          {preview.length === 0 ? (
            <li className="text-sm text-text-muted">{t.common.noData}</li>
          ) : (
            preview.map((item) => (
              <AlertItemRow
                key={item.code}
                item={item}
                meta={renderMeta(item)}
                badgeClass={badgeClass}
                badgeLabel={badgeLabel}
              />
            ))
          )}
        </ul>
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="text-text-muted">
            {t.sparepart.totalNItems.replace("{n}", String(items.length))}
          </span>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="cursor-pointer font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              {t.sparepart.viewAll}
            </button>
          ) : null}
        </div>
      </section>

      {open ? (
        <Modal
          title={
            <span>
              {title}{" "}
              <span className="font-normal text-text-muted">{subtitle}</span>
            </span>
          }
          size="md"
          onClose={() => setOpen(false)}
          subtitle={
            <div className="mt-1 flex items-center gap-2 text-xs text-text-dim">
              <span>{t.sparepart.totalNItems.replace("{n}", String(filteredItems.length))}</span>
              {query.trim() ? (
                <span>
                  {t.common.search}: <span className="text-text">{query}</span>
                </span>
              ) : null}
            </div>
          }
          footer={
            <>
              <button
                type="button"
                onClick={() => router.push("/sparepart/stock")}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              >
                {t.dashboard.viewDetail}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
              >
                {t.common.close}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.sparepart.alertSearchPlaceholder}
              className="w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />

            {filteredItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-subtle bg-bg/20 px-4 py-8 text-center text-sm text-text-muted">
                {t.common.noData}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border-subtle">
                <div className="grid grid-cols-[120px_minmax(0,1fr)_90px_84px] gap-3 border-b border-border-subtle bg-bg/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-dim">
                  <span>{t.sparepart.alertColCode}</span>
                  <span>{t.sparepart.alertColName}</span>
                  <span className="text-right">{t.sparepart.alertColStock}</span>
                  <span className="text-right">{t.sparepart.alertColStatus}</span>
                </div>
                <div className="max-h-[58vh] overflow-y-auto">
                  {filteredItems.map((item: AlertItem) => (
                    <AlertItemCompactRow
                      key={item.code}
                      item={item}
                      categories={categories}
                      badgeClass={badgeClass}
                      badgeLabel={badgeLabel}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function AlertItemRow({
  item,
  meta,
  badgeClass,
  badgeLabel,
}: {
  item: AlertItem;
  meta: string;
  badgeClass: string;
  badgeLabel: string;
}) {
  return (
    <li className="flex items-start justify-between gap-2 text-xs">
      <div className="min-w-0">
        <p className="font-medium text-text">{item.code}</p>
        <p className="truncate text-text-muted">{meta}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
      >
        {badgeLabel}
      </span>
    </li>
  );
}

function AlertItemCompactRow({
  item,
  categories,
  badgeClass,
  badgeLabel,
}: {
  item: AlertItem;
  categories: SparepartOverviewData["categories"];
  badgeClass: string;
  badgeLabel: string;
}) {
  const { t, lang } = useLang();
  const uom =
    item.uom_code && item.uom_code.toUpperCase() === "PCS"
      ? t.sparepart.pcs
      : item.uom_code;

  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)_90px_84px] gap-3 border-t border-border-subtle/70 px-4 py-3 text-sm first:border-t-0">
      <div className="min-w-0">
        <p className="font-semibold text-text">{item.code}</p>
        <p className="mt-0.5 text-[11px] text-text-dim">
          {localizedCategoryLabel(item.category_code, categories, lang, {
            name_en: item.category_name_en,
            name_cn: item.category_name_cn,
          })}
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-text-muted">{localizedName(item, lang)}</p>
      </div>
      <div className="text-right tabular-nums text-text">
        {item.stock_current}
        {typeof item.min_stock === "number" ? ` / ${item.min_stock}` : ""}
        {uom ? ` ${uom}` : ""}
      </div>
      <div className="text-right">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
        >
          {badgeLabel}
        </span>
      </div>
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
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M3 7L10 3L21 7M3 7V12L14 16L21 12V7M3 7L14 11L21 7" />
        <path d="M3 12V17L14 21L21 17V12" />
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
