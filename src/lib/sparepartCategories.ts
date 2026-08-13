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

export const DEFAULT_SPAREPART_CATEGORY_CODE: SparepartCategoryCode = "IT";

/** Low stock: reorder point is set and on-hand is at or below it. */
export const LOW_STOCK_SQL = `i.min_stock > 0 AND i.stock_current <= i.min_stock`;

export const ITEM_CATEGORY_SELECT = `
  i.id, i.code, i.name_en, i.name_cn, i.brand_en, i.brand_cn, i.model,
  i.stock_current, i.min_stock, i.category_id,
  c.code AS category_code, c.name_en AS category_name_en, c.name_cn AS category_name_cn,
  i.image_url, i.notes, i.deleted_at, i.created_at, i.updated_at
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

export function isLowStock(minStock: number, stockCurrent: number): boolean {
  return minStock > 0 && stockCurrent <= minStock;
}

export function isCriticalStock(minStock: number, stockCurrent: number): boolean {
  return minStock > 0 && stockCurrent <= 0;
}
