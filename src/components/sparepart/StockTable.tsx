"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, localizedName, localizedField } from "@/lib/i18n";
import {
  isCriticalStock,
  isItemActive,
  isLowStock,
} from "@/lib/sparepartCategories";
import type { SparepartItem, SparepartStockBalanceRow } from "@/lib/types";
import type { SortDir, SortKey } from "@/lib/sparepartSort";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export type StockTableVariant = "master" | "stock";
export type { SortDir, SortKey };

type TableRow = SparepartItem | SparepartStockBalanceRow;

function isBalanceRow(row: TableRow): row is SparepartStockBalanceRow {
  return "item_id" in row;
}

function rowKey(row: TableRow): string {
  if (isBalanceRow(row)) {
    return String(row.item_id);
  }
  return String(row.id);
}

function rowStock(row: TableRow): number {
  return row.stock_current;
}

function rowMinStock(row: TableRow): number {
  return row.min_stock;
}

function rowIsActive(row: TableRow): boolean {
  return isItemActive(row.is_active);
}

function rowUom(row: TableRow): string {
  return row.uom_code?.trim() || "";
}

function formatQty(qty: number, uom: string): string {
  return uom ? `${qty} ${uom}` : String(qty);
}

function rowCategoryLabel(
  row: TableRow,
  lang: "en" | "cn",
): string {
  return (
    localizedName(
      {
        name_en: row.category_name_en ?? null,
        name_cn: row.category_name_cn ?? null,
      },
      lang,
    ) || row.category_code || "-"
  );
}

type Props = {
  rows: TableRow[];
  totalCount: number;
  page: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  onEdit?: (row: SparepartItem) => void;
  onDelete?: (row: SparepartItem) => void;
  onRowClick?: (row: TableRow) => void;
  variant?: StockTableVariant;
  readOnly?: boolean;
  sortKey?: SortKey | null;
  sortDir?: SortDir;
  onSortChange?: (key: SortKey | null, dir: SortDir | null) => void;
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

function ChevronIcon({
  direction,
  active,
  className = "",
}: {
  direction: "up" | "down";
  active: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 10 6"
      className={`h-2 w-2.5 shrink-0 ${
        active ? "text-text opacity-100" : "text-text-dim opacity-50"
      } ${className}`}
      fill="currentColor"
      aria-hidden
    >
      {direction === "up" ? (
        <path d="M5 0L10 6H0L5 0Z" />
      ) : (
        <path d="M5 6L0 0H10L5 6Z" />
      )}
    </svg>
  );
}

function SortHeader({
  label,
  columnKey,
  sortKey,
  sortDir,
  open,
  onOpenChange,
  onSortChange,
  sortAscLabel,
  sortDescLabel,
  className = "",
}: {
  label: string;
  columnKey: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSortChange: (key: SortKey | null, dir: SortDir | null) => void;
  sortAscLabel: string;
  sortDescLabel: string;
  className?: string;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const active = sortKey === columnKey;
  const ariaSort = active
    ? sortDir === "asc"
      ? "ascending"
      : "descending"
    : "none";
  const chevronDir = active && sortDir === "asc" ? "up" : "down";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  const pick = (dir: SortDir) => {
    if (active && sortDir === dir) {
      onSortChange(null, null);
    } else {
      onSortChange(columnKey, dir);
    }
    onOpenChange(false);
  };

  return (
    <th
      className={[th, className, className.includes("text-center") ? "!text-center" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-sort={ariaSort}
    >
      <div
        className={[
          "relative inline-block",
          className.includes("text-center") ? "w-full" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        ref={menuRef}
      >
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={[
            "inline-flex items-center rounded-sm uppercase tracking-wide transition-colors",
            "hover:text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
            className.includes("text-center") ? "justify-center w-full" : "text-left",
            active || open ? "text-text" : "text-text-dim",
          ].join(" ")}
        >
          {label}
          <ChevronIcon
            direction={chevronDir}
            active={active || open}
            className="ml-1.5"
          />
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute left-0 z-30 mt-1 min-w-[10.5rem] rounded-md border border-border bg-bg-elevated py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => pick("asc")}
              className={[
                "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs",
                active && sortDir === "asc"
                  ? "bg-accent/10 text-text"
                  : "text-text-muted hover:bg-surface-hover hover:text-text",
              ].join(" ")}
            >
              <ChevronIcon direction="up" active={active && sortDir === "asc"} />
              <span className="normal-case tracking-normal">{sortAscLabel}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => pick("desc")}
              className={[
                "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs",
                active && sortDir === "desc"
                  ? "bg-accent/10 text-text"
                  : "text-text-muted hover:bg-surface-hover hover:text-text",
              ].join(" ")}
            >
              <ChevronIcon
                direction="down"
                active={active && sortDir === "desc"}
              />
              <span className="normal-case tracking-normal">{sortDescLabel}</span>
            </button>
          </div>
        ) : null}
      </div>
    </th>
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
  sortKey = null,
  sortDir = "asc",
  onSortChange,
}: Props) {
  const { t, lang } = useLang();
  const [openSortKey, setOpenSortKey] = useState<SortKey | null>(null);
  const pageSizeOptions = PAGE_SIZE_OPTIONS.map((n) => ({
    value: String(n),
    label: String(n),
  }));

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
  const showItemStatus = variant === "master";
  const clickable = Boolean(onRowClick);
  const sortable = Boolean(onSortChange);

  const renderSortHeader = (
    label: string,
    columnKey: SortKey,
    className = "",
  ) => (
    <SortHeader
      key={columnKey}
      label={label}
      columnKey={columnKey}
      sortKey={sortKey}
      sortDir={sortDir}
      open={openSortKey === columnKey}
      onOpenChange={(next) => setOpenSortKey(next ? columnKey : null)}
      onSortChange={onSortChange!}
      sortAscLabel={t.common.sortAsc}
      sortDescLabel={t.common.sortDesc}
      className={className}
    />
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          {showCurrentStock ? (
            <colgroup>
              <col style={{ width: "11%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "11%" }} />
              {showActions ? <col style={{ width: "6rem" }} /> : null}
            </colgroup>
          ) : showItemStatus ? (
            <colgroup>
              <col style={{ width: "12%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              {showActions ? <col style={{ width: "6rem" }} /> : null}
            </colgroup>
          ) : null}
          <thead className="border-b border-border-subtle bg-bg/40">
            <tr>
              {sortable && onSortChange ? (
                <>
                  {renderSortHeader(t.sparepart.code, "code")}
                  {renderSortHeader(t.sparepart.name, "name")}
                  {renderSortHeader(t.sparepart.brand, "brand")}
                  {renderSortHeader(t.sparepart.model, "model")}
                  {renderSortHeader(t.sparepart.category, "category")}
                  {renderSortHeader(t.sparepart.minStock, "min_stock", "text-center")}
                  {showCurrentStock
                    ? renderSortHeader(
                        t.sparepart.stockCurrent,
                        "stock_current",
                        "text-center",
                      )
                    : null}
                  {showCurrentStock ? (
                    <th className={`${th} text-center`}>
                      {t.sparepart.stockStatus}
                    </th>
                  ) : null}
                  {showItemStatus ? (
                    <th className={`${th} text-center`}>
                      {t.sparepart.stockStatus}
                    </th>
                  ) : null}
                </>
              ) : (
                <>
                  <th className={th}>{t.sparepart.code}</th>
                  <th className={th}>{t.sparepart.name}</th>
                  <th className={th}>{t.sparepart.brand}</th>
                  <th className={th}>{t.sparepart.model}</th>
                  <th className={th}>{t.sparepart.category}</th>
                  <th className={`${th} text-center`}>{t.sparepart.minStock}</th>
                  {showCurrentStock ? (
                    <th className={`${th} text-center`}>
                      {t.sparepart.stockCurrent}
                    </th>
                  ) : null}
                  {showCurrentStock ? (
                    <th className={`${th} text-center`}>
                      {t.sparepart.stockStatus}
                    </th>
                  ) : null}
                  {showItemStatus ? (
                    <th className={`${th} text-center`}>
                      {t.sparepart.stockStatus}
                    </th>
                  ) : null}
                </>
              )}
              {showActions ? <th className={th}>{t.common.actions}</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={clickable ? () => onRowClick?.(row) : undefined}
                className={[
                  "border-b border-border-subtle/60 last:border-0 hover:bg-surface-hover/50",
                  clickable ? "cursor-pointer" : "",
                ].join(" ")}
              >
                <td className={`${td} font-medium text-text`}>
                  <span className="line-clamp-2 break-words">{row.code}</span>
                </td>
                <td className={td}>
                  <span className="line-clamp-2 break-words text-text">
                    {localizedName(row, lang)}
                  </span>
                </td>
                <td className={td}>
                  <span className="line-clamp-2 break-words">
                    {localizedField(row.brand_en, row.brand_cn, lang)}
                  </span>
                </td>
                <td className={td}>
                  <span className="line-clamp-2 break-words">
                    {row.model || "-"}
                  </span>
                </td>
                <td className={td}>
                  <span className="line-clamp-2 break-words text-text">
                    {rowCategoryLabel(row, lang)}
                  </span>
                </td>
                <td className={`${td} text-center whitespace-nowrap tabular-nums`}>
                  {formatQty(rowMinStock(row), rowUom(row))}
                </td>
                {showCurrentStock ? (
                  <td
                    className={`${td} text-center whitespace-nowrap tabular-nums font-medium ${
                      rowStock(row) <= 0 ? "text-danger" : "text-text"
                    }`}
                  >
                    {formatQty(rowStock(row), rowUom(row))}
                  </td>
                ) : null}
                {showCurrentStock ? (
                  <td className={`${td} text-center`}>
                    {isCriticalStock(
                      rowMinStock(row),
                      rowStock(row),
                      rowIsActive(row),
                    ) ? (
                      <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
                        {t.sparepart.statusCritical}
                      </span>
                    ) : isLowStock(
                        rowMinStock(row),
                        rowStock(row),
                        rowIsActive(row),
                      ) ? (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                        {t.sparepart.statusLow}
                      </span>
                    ) : (
                      <span className="text-text-dim">—</span>
                    )}
                  </td>
                ) : null}
                {showItemStatus ? (
                  <td className={`${td} text-center`}>
                    {rowIsActive(row) ? (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                        {t.sparepart.active}
                      </span>
                    ) : (
                      <span className="rounded-full bg-text-dim/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-dim">
                        {t.sparepart.nonActive}
                      </span>
                    )}
                  </td>
                ) : null}
                {showActions ? (
                  <td
                    className={`${td} whitespace-nowrap`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isBalanceRow(row) && onEdit ? (
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className="mr-2 text-accent hover:underline"
                      >
                        {t.common.edit}
                      </button>
                    ) : null}
                    {!isBalanceRow(row) && onDelete ? (
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
            <span className="ml-2 inline-block align-middle">
              <SparepartDropdown
                compact
                menuPlacement="top"
                className="min-w-[4.5rem]"
                value={String(pageSize)}
                onChange={(next) => onPageSizeChange(Number(next) as PageSize)}
                options={pageSizeOptions}
              />
            </span>
          </label>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
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
            className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.common.next}
          </button>
        </div>
      </div>
    </div>
  );
}
