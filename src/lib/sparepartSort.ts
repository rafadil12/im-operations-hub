import type { SparepartItem, SparepartStockBalanceRow } from "@/lib/types";

export type SortKey =
  | "code"
  | "name"
  | "brand"
  | "model"
  | "location"
  | "stock_current";

export type SortDir = "asc" | "desc";

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
    } else {
      cmp = compareStrings(a[key], b[key]);
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
    } else if (key === "location") {
      cmp = compareStrings(a.location_name, b.location_name);
    } else {
      cmp = compareStrings(a[key], b[key]);
    }
    if (cmp !== 0) return cmp * dir;
    const byCode = compareStrings(a.code, b.code);
    if (byCode !== 0) return byCode;
    return compareStrings(a.location_name, b.location_name);
  });
}
