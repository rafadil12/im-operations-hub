"use client";

import { useLang } from "@/lib/i18n";
import type { SparepartItem } from "@/lib/types";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export type StockTableVariant = "master" | "stock";

type Props = {
  rows: SparepartItem[];
  totalCount: number;
  page: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  onEdit?: (row: SparepartItem) => void;
  onDelete?: (row: SparepartItem) => void;
  onRowClick?: (row: SparepartItem) => void;
  variant?: StockTableVariant;
  readOnly?: boolean;
};

const th =
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
const td = "px-3 py-2 align-top text-xs text-text-muted";

function fillTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function StockTable({
  rows,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onRowClick,
  variant = "stock",
  readOnly = false,
}: Props) {
  const { t } = useLang();

  if (totalCount === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
        {t.common.noData}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  const showActions = !readOnly && (onEdit || onDelete);
  const showCurrentStock = variant === "stock";
  const clickable = Boolean(onRowClick);

  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="border-b border-border-subtle bg-bg/40">
            <tr>
              <th className={th}>{t.sparepart.code}</th>
              <th className={th}>{t.sparepart.name}</th>
              <th className={th}>{t.sparepart.brand}</th>
              <th className={th}>{t.sparepart.model}</th>
              <th className={th}>{t.sparepart.location}</th>
              {showCurrentStock ? (
                <th className={th}>{t.sparepart.stockCurrent}</th>
              ) : null}
              {showActions ? <th className={th}>{t.common.actions}</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={clickable ? () => onRowClick?.(row) : undefined}
                className={[
                  "border-b border-border-subtle/60 last:border-0 hover:bg-surface-hover/50",
                  clickable ? "cursor-pointer" : "",
                ].join(" ")}
              >
                <td className={`${td} whitespace-nowrap font-medium text-text`}>
                  {row.code}
                </td>
                <td className={`${td} max-w-xs`}>
                  <span className="line-clamp-2 text-text">{row.name}</span>
                </td>
                <td className={`${td} whitespace-nowrap`}>{row.brand || "-"}</td>
                <td className={`${td} max-w-[10rem]`}>
                  <span className="line-clamp-2">{row.model || "-"}</span>
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  {row.location || "-"}
                </td>
                {showCurrentStock ? (
                  <td
                    className={`${td} tabular-nums font-medium ${
                      row.stock_current <= 0 ? "text-danger" : "text-text"
                    }`}
                  >
                    {row.stock_current}
                  </td>
                ) : null}
                {showActions ? (
                  <td
                    className={`${td} whitespace-nowrap`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onEdit ? (
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className="mr-2 text-accent hover:underline"
                      >
                        {t.common.edit}
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        className="text-danger hover:underline"
                      >
                        {t.common.delete}
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-3 py-2.5">
        <p className="text-xs text-text-dim">
          {fillTemplate(t.common.showingRange, { from, to, total: totalCount })}
        </p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted">
            {t.common.rowsPerPage}
            <select
              className="ml-2 rounded border border-border bg-bg px-2 py-1 text-xs text-text"
              value={pageSize}
              onChange={(e) =>
                onPageSizeChange(Number(e.target.value) as PageSize)
              }
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
          >
            {t.common.previous}
          </button>
          <span className="text-xs text-text-muted">
            {fillTemplate(t.common.pageOf, { page, total: totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
          >
            {t.common.next}
          </button>
        </div>
      </div>
    </div>
  );
}
