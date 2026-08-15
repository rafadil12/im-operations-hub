import type { SparepartCategoryCode } from "@/lib/types";

export type { SparepartCategoryCode };

export const SPAREPART_CATEGORY_CODES: SparepartCategoryCode[] = [
  "IT",
  "AGV",
  "ASSEMBLY",
  "MES",
];

export const SPAREPART_CATEGORY_COLORS: Record<SparepartCategoryCode, string> = {
  IT: "#3b82f6",
  AGV: "#22c55e",
  ASSEMBLY: "#f59e0b",
  MES: "#a855f7",
};

const FALLBACK_CATEGORY_COLOR = "#64748b";

export const DEFAULT_SPAREPART_CATEGORY_CODE: SparepartCategoryCode = "IT";

/** Low stock: reorder point is set and on-hand is at or below it. */
export const LOW_STOCK_SQL = `i.min_stock > 0 AND i.stock_current <= i.min_stock`;

export const ITEM_CATEGORY_SELECT = `
  i.id, i.code, i.name_en, i.name_cn, i.brand_en, i.brand_cn, i.model,
  i.stock_current, i.min_stock, i.category_id, i.uom_id,
  c.code AS category_code, c.name_en AS category_name_en, c.name_cn AS category_name_cn,
  u.code AS uom_code, u.name_en AS uom_name_en, u.name_cn AS uom_name_cn,
  i.image_url, i.notes, i.deleted_at, i.created_at, i.updated_at
`;

export const ITEM_CATEGORY_FROM = `
  sparepart_items i
  JOIN sparepart_categories c ON c.id = i.category_id
  JOIN uoms u ON u.id = i.uom_id
`;

export function isSparepartCategoryCode(
  value: string,
): value is SparepartCategoryCode {
  return (SPAREPART_CATEGORY_CODES as string[]).includes(value);
}

export function normalizeCategoryCode(
  value: string,
): SparepartCategoryCode | null {
  const code = value.trim().toUpperCase();
  if (code === "ASSEMBLY" || code === "ASM") return "ASSEMBLY";
  if (isSparepartCategoryCode(code)) return code;
  return null;
}

export function canonicalCategoryCode(value: string): string {
  return normalizeCategoryCode(value) ?? value.trim().toUpperCase();
}

/** Group rows that share a canonical code (e.g. ASM + ASSEMBLY). */
export function groupByCanonicalCategory<T extends { code: string }>(
  rows: T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = canonicalCategoryCode(row.code);
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

export function preferredCanonicalCategoryRow<T extends { code: string }>(
  canonicalCode: string,
  group: T[],
): T {
  return (
    group.find(
      (row) => row.code.trim().toUpperCase() === canonicalCode,
    ) ?? group[0]
  );
}

export function categoryColor(code: string | null | undefined): string {
  const normalized = code ? normalizeCategoryCode(code) : null;
  return normalized
    ? SPAREPART_CATEGORY_COLORS[normalized]
    : FALLBACK_CATEGORY_COLOR;
}

/** SQL predicate + params so ASSEMBLY also matches DB alias ASM. */
export function categoryMatchSql(
  column: string,
  filter: SparepartCategoryCode,
): { sql: string; params: string[] } {
  const expr = `UPPER(TRIM(${column}))`;
  if (filter === "ASSEMBLY") {
    return { sql: `${expr} IN (?, ?)`, params: ["ASSEMBLY", "ASM"] };
  }
  return { sql: `${expr} = ?`, params: [filter] };
}

export function isLowStock(minStock: number, stockCurrent: number): boolean {
  return minStock > 0 && stockCurrent <= minStock;
}

export function isCriticalStock(minStock: number, stockCurrent: number): boolean {
  return minStock > 0 && stockCurrent <= 0;
}
