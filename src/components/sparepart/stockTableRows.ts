import { isItemActive } from "@/lib/sparepart/categories";
import { localizedName } from "@/lib/i18n";
import type { SparepartItem, SparepartStockBalanceRow } from "@/lib/types";
import type { SortDir, SortKey } from "@/lib/sparepart/sort";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export type StockTableVariant = "master" | "stock";
export type { SortDir, SortKey };

export type StockTableRow = SparepartItem | SparepartStockBalanceRow;

export function isBalanceRow(row: StockTableRow): row is SparepartStockBalanceRow {
  return "item_id" in row;
}

export function rowKey(row: StockTableRow): string {
  if (isBalanceRow(row)) {
    return String(row.item_id);
  }
  return String(row.id);
}

export function rowStock(row: StockTableRow): number {
  return row.stock_current;
}

export function rowMinStock(row: StockTableRow): number {
  return row.min_stock;
}

export function rowIsActive(row: StockTableRow): boolean {
  return isItemActive(row.is_active);
}

export function rowUom(row: StockTableRow): string {
  return row.uom_code?.trim() || "";
}

export function formatQty(qty: number, uom: string): string {
  return uom ? `${qty} ${uom}` : String(qty);
}

export function rowCategoryLabel(row: StockTableRow, lang: "en" | "cn"): string {
  return (
    localizedName(
      {
        name_en: row.category_name_en ?? null,
        name_cn: row.category_name_cn ?? null,
      },
      lang
    ) ||
    row.category_code ||
    "-"
  );
}

export const STOCK_TABLE_TH =
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
export const STOCK_TABLE_TD = "px-3 py-2 align-top text-xs text-text-muted";
