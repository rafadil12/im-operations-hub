import { stockLevelStatus } from "@/lib/sparepartCategories";
import type { SparepartItem, SparepartStockBalanceRow } from "@/lib/types";

export type SortKey =
  | "code"
  | "name"
  | "brand"
  | "model"
  | "category"
  | "min_stock"
  | "stock_current"
  | "status";

export type SortDir = "asc" | "desc";

type SortableRow = SparepartItem | SparepartStockBalanceRow;

const STATUS_RANK = { critical: 0, low: 1, normal: 2 } as const;

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
  const left = (a ?? "").trim();
  const right = (b ?? "").trim();
  const leftEmpty = left.length === 0;
  const rightEmpty = right.length === 0;
  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return 1;
  if (rightEmpty) return -1;
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function sortField(row: SortableRow, key: SortKey): string | null {
  switch (key) {
    case "name":
      return row.name_en || row.name_cn;
    case "brand":
      return row.brand_en || row.brand_cn;
    case "code":
    case "model":
      return row[key];
    case "category":
      return row.category_name_en || row.category_code || null;
    default:
      return null;
  }
}

function compareStatus(a: SortableRow, b: SortableRow): number {
  return (
    STATUS_RANK[stockLevelStatus(a.min_stock, a.stock_current, a.is_active)] -
    STATUS_RANK[stockLevelStatus(b.min_stock, b.stock_current, b.is_active)]
  );
}

/** When sortKey is null, default order is material code ascending. */
export function sortSparepartItems(
  rows: SparepartItem[],
  sortKey: SortKey | null,
  sortDir: SortDir,
): SparepartItem[] {
  const key = sortKey ?? "code";
  const dir = (sortKey == null ? "asc" : sortDir) === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (key === "stock_current") {
      cmp = a.stock_current - b.stock_current;
    } else if (key === "min_stock") {
      cmp = a.min_stock - b.min_stock;
    } else if (key === "status") {
      cmp = compareStatus(a, b);
    } else {
      cmp = compareStrings(sortField(a, key), sortField(b, key));
    }
    if (cmp !== 0) return cmp * dir;
    return compareStrings(a.code, b.code);
  });
}

export function sortStockBalanceRows(
  rows: SparepartStockBalanceRow[],
  sortKey: SortKey | null,
  sortDir: SortDir,
): SparepartStockBalanceRow[] {
  const key = sortKey ?? "code";
  const dir = (sortKey == null ? "asc" : sortDir) === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (key === "stock_current") {
      cmp = a.stock_current - b.stock_current;
    } else if (key === "min_stock") {
      cmp = a.min_stock - b.min_stock;
    } else if (key === "status") {
      cmp = compareStatus(a, b);
    } else {
      cmp = compareStrings(sortField(a, key), sortField(b, key));
    }
    if (cmp !== 0) return cmp * dir;
    return compareStrings(a.code, b.code);
  });
}
