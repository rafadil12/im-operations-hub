"use client";

import { localizedName, useLang } from "@/lib/i18n";
import {
  categoryColor,
  localizedCategoryLabel,
} from "@/lib/sparepart/categories";
import { formatUomDisplay } from "@/lib/sparepart/uoms";
import type {
  SparepartOverviewCategoryTab,
  SparepartOverviewLocationStock,
  SparepartOverviewTopUsedItem,
} from "@/lib/sparepart/overview";

const RANK_TONES = [
  "bg-[#3b82f6]/15 text-[#2563eb] ring-1 ring-[#3b82f6]/25",
  "bg-[#8b5cf6]/15 text-[#7c3aed] ring-1 ring-[#8b5cf6]/25",
  "bg-[#14b8a6]/15 text-[#0f766e] ring-1 ring-[#14b8a6]/25",
  "bg-[#f59e0b]/15 text-[#d97706] ring-1 ring-[#f59e0b]/25",
  "bg-[#64748b]/15 text-[#475569] ring-1 ring-[#64748b]/25",
] as const;

export function TopUsedList({
  items,
  categories,
}: {
  items: SparepartOverviewTopUsedItem[];
  categories: SparepartOverviewCategoryTab[];
}) {
  const { t, lang } = useLang();

  return (
    <div className="flex min-h-[455px] flex-col">
      {items.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-sm text-text-muted">
          {t.common.noData}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => {
            const color = categoryColor(item.category_code);
            const categoryLabel = localizedCategoryLabel(
              item.category_code,
              categories,
              lang,
              {
                name_en: item.category_name_en,
                name_cn: item.category_name_cn,
              }
            );
            const uom = formatUomDisplay(
              { code: item.uom_code, name_cn: item.uom_name_cn },
              lang
            );
            const qtyLabel = uom
              ? `${item.qty.toLocaleString()} ${uom}`
              : `${item.qty.toLocaleString()} ${t.sparepart.qty}`;

            return (
              <li
                key={item.code}
                className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg/30 p-3 shadow-[0_6px_4px_var(--shadow-color-soft)]"
              >
                <span
                  className={[
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    RANK_TONES[index] ?? RANK_TONES[4],
                  ].join(" ")}
                >
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">{item.code}</p>
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    {localizedName(item, lang)}
                  </p>
                  <span
                    className="mt-1.5 inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
                    style={{
                      color,
                      background: `color-mix(in srgb, ${color} 14%, transparent)`,
                      boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 32%, transparent)`,
                    }}
                  >
                    {categoryLabel}
                  </span>
                </div>

                <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-accent">
                  {qtyLabel}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function LocationBars({ rows }: { rows: SparepartOverviewLocationStock[] }) {
  const { t, lang } = useLang();
  const data = rows.slice(0, 5);
  const max = Math.max(1, ...data.map((row) => row.qty));
  const total = data.reduce((sum, row) => sum + row.qty, 0);

  if (data.length === 0) {
    return <p className="text-sm text-text-muted">{t.common.noData}</p>;
  }

  return (
    <div className="space-y-3.5">
      {data.map((row) => {
        const pctOfTotal = total > 0 ? Math.round((row.qty / total) * 100) : 0;
        const displayName = localizedName(
          {
            name_en: row.name_en ?? row.name,
            name_cn: row.name_cn ?? null,
          },
          lang
        );
        return (
          <div
            key={`${row.locationId}-${row.code}`}
            className="rounded-md border border-border-subtle/80 bg-bg/10 px-3 py-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-text">{displayName}</p>
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
