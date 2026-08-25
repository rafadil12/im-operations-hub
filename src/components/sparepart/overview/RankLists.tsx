"use client";

import { localizedName, useLang } from "@/lib/i18n";
import { localizedCategoryLabel } from "@/lib/sparepart/categories";
import type {
  SparepartOverviewCategoryTab,
  SparepartOverviewLocationStock,
  SparepartOverviewTopUsedItem,
} from "@/lib/sparepart/overview";

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
                    ? ` ${item.uom_code.toUpperCase() === "PCS" ? t.sparepart.pcs : item.uom_code}`
                    : ` ${t.sparepart.qty}`}
                </span>
              </div>

              <div className="mt-2 text-[11px] tracking-wide text-text-dim">
                {localizedCategoryLabel(item.category_code, categories, lang, {
                  name_en: item.category_name_en,
                  name_cn: item.category_name_cn,
                })}
              </div>
            </div>
          </div>
        </div>
      ))}
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
    <div className="space-y-2.5">
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
