"use client";

import { useState } from "react";
import { useLang, localizedName, localizedField } from "@/lib/i18n";
import { fillTemplate } from "@/lib/i18n/fillTemplate";
import { stockLevelStatus } from "@/lib/sparepart/categories";
import type { SparepartItem } from "@/lib/types";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";
import { StockLevelBadge } from "@/components/sparepart/StockLevelBadge";
import { SortHeader } from "@/components/sparepart/StockTableSort";
import {
  PAGE_SIZE_OPTIONS,
  type PageSize,
  type SortDir,
  type SortKey,
  type StockTableRow,
  type StockTableVariant,
  formatQty,
  isBalanceRow,
  rowCategoryLabel,
  rowIsActive,
  rowKey,
  rowMinStock,
  rowStock,
  rowUom,
  STOCK_TABLE_TD as td,
  STOCK_TABLE_TH as th,
} from "@/components/sparepart/stockTableRows";

export { PAGE_SIZE_OPTIONS, type PageSize, type SortDir, type SortKey, type StockTableVariant };

type Props = {
  rows: StockTableRow[];
  totalCount: number;
  page: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  onEdit?: (row: SparepartItem) => void;
  onDelete?: (row: SparepartItem) => void;
  onRowClick?: (row: StockTableRow) => void;
  variant?: StockTableVariant;
  readOnly?: boolean;
  sortKey?: SortKey | null;
  sortDir?: SortDir;
  onSortChange?: (key: SortKey | null, dir: SortDir | null) => void;
};

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
    menuAlign: "left" | "right" = "left"
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
      menuAlign={menuAlign}
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
              <col style={{ width: "12%" }} />
              <col style={{ width: "9%" }} />
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
                    ? renderSortHeader(t.sparepart.stockCurrent, "stock_current", "text-center")
                    : null}
                  {showCurrentStock
                    ? renderSortHeader(t.sparepart.stockStatus, "status", "text-center", "right")
                    : null}
                  {showItemStatus ? (
                    <th className={`${th} text-center !text-center`}>{t.sparepart.stockStatus}</th>
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
                    <th className={`${th} text-center`}>{t.sparepart.stockCurrent}</th>
                  ) : null}
                  {showCurrentStock ? (
                    <th className={`${th} text-center`}>{t.sparepart.stockStatus}</th>
                  ) : null}
                  {showItemStatus ? (
                    <th className={`${th} text-center !text-center`}>{t.sparepart.stockStatus}</th>
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
                  <span className="line-clamp-2 break-words">{row.model || "-"}</span>
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
                    <StockLevelBadge
                      status={stockLevelStatus(rowMinStock(row), rowStock(row), rowIsActive(row))}
                      labels={{
                        critical: t.sparepart.statusCritical,
                        low: t.sparepart.statusLow,
                        normal: t.sparepart.statusNormal,
                      }}
                    />
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
                  <td className={`${td} whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
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
