import type { SparepartCategoryCode } from "@/lib/types";

export type SparepartOverviewCategoryTab = {
  id: number;
  code: SparepartCategoryCode | string;
  name_en: string;
  name_cn: string;
  itemCount: number;
  stockQty: number;
};

export type SparepartOverviewSparkPoint = {
  date: string;
  qty: number;
};

export type SparepartOverviewKpi = {
  totalItems: number;
  totalStock: number;
  totalStockMomPct: number | null;
  lowStockCount: number;
  lowStockMomPct: number | null;
  movementQty: number;
  movementMomPct: number | null;
  activeLocations: number;
  sparkline: SparepartOverviewSparkPoint[];
};

export type SparepartOverviewByCategory = {
  code: string;
  name_en: string;
  name_cn: string;
  totalItems: number;
  currentStock: number;
  lowStock: number;
  movementQty: number;
  netMovement: number;
};

export type SparepartOverviewMonthlyBar = {
  month: string;
  inQty: number;
  outQty: number;
};

export type SparepartOverviewBarGrain = "day" | "week" | "month";

export type SparepartOverviewMovementSummary = {
  inQty: number;
  inDocs: number;
  outQty: number;
  outDocs: number;
  netQty: number;
  transactionCount: number;
  /** How `monthly` buckets are aggregated for Movement Summary bars. */
  barGrain: SparepartOverviewBarGrain;
  monthly: SparepartOverviewMonthlyBar[];
};

export type SparepartOverviewTypeSlice = {
  type: "in" | "out" | "transfer" | "reversal";
  qty: number;
};

export type SparepartOverviewTopUsedItem = {
  code: string;
  name_en: string | null;
  name_cn: string | null;
  category_code: string;
  category_name_en?: string | null;
  category_name_cn?: string | null;
  uom_code?: string | null;
  qty: number;
};

export type SparepartOverviewTrendPoint = {
  date: string;
  IT: number;
  AGV: number;
  ASSEMBLY: number;
  MES: number;
};

export type SparepartOverviewLocationStock = {
  locationId: number;
  code: string;
  name: string;
  name_en?: string | null;
  name_cn?: string | null;
  qty: number;
};

export type SparepartOverviewHeatmapCell = {
  categoryCode: string;
  locationId: number;
  locationName: string;
  locationNameEn?: string | null;
  locationNameCn?: string | null;
  qty: number;
};

export type SparepartOverviewTopItem = {
  code: string;
  name_en: string | null;
  name_cn: string | null;
  category_code: string;
  category_name_en?: string | null;
  category_name_cn?: string | null;
  uom_code?: string | null;
  stock_current: number;
};

export type SparepartOverviewLowItem = {
  code: string;
  name_en: string | null;
  name_cn: string | null;
  category_code: string;
  category_name_en?: string | null;
  category_name_cn?: string | null;
  uom_code?: string | null;
  stock_current: number;
  min_stock: number;
  status: "critical" | "low";
};

export type SparepartOverviewCalendarCell = {
  date: string;
  qty: number;
};

export type SparepartOverviewSparseItem = {
  code: string;
  name_en: string | null;
  name_cn: string | null;
  category_code: string;
  category_name_en?: string | null;
  category_name_cn?: string | null;
  uom_code?: string | null;
  stock_current: number;
  min_stock: number;
};

export type SparepartOverviewData = {
  range: { start: string; end: string };
  category: string | null;
  categories: SparepartOverviewCategoryTab[];
  kpi: SparepartOverviewKpi;
  byCategory: SparepartOverviewByCategory[];
  movementSummary: SparepartOverviewMovementSummary;
  movementByType: SparepartOverviewTypeSlice[];
  topUsedItems: SparepartOverviewTopUsedItem[];
  trendDaily: SparepartOverviewTrendPoint[];
  stockByLocation: SparepartOverviewLocationStock[];
  categoryLocationHeatmap: SparepartOverviewHeatmapCell[];
  topStock: SparepartOverviewTopItem[];
  lowStockItems: SparepartOverviewLowItem[];
  movementHeatmap: SparepartOverviewCalendarCell[];
  sparseItems: SparepartOverviewSparseItem[];
};

export function overviewMatchesFilters(
  data: SparepartOverviewData,
  category: string | null,
  range: { start: string; end: string }
): boolean {
  return (
    data.category === category && data.range.start === range.start && data.range.end === range.end
  );
}

export function momPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

/** Inventory qty change from a movement (311/312 do not change total stock). */
export const STOCK_DELTA_SQL = `
  CASE
    WHEN d.movement_type = '101' THEN li.qty
    WHEN d.movement_type = '102' THEN -li.qty
    WHEN d.movement_type = '201' THEN -li.qty
    WHEN d.movement_type = '202' THEN li.qty
    ELSE 0
  END
`;

/** Activity volume: forwards add, reversals subtract. */
export const MOVEMENT_VOLUME_SQL = `
  CASE
    WHEN d.movement_type IN ('101', '201', '311') THEN li.qty
    WHEN d.movement_type IN ('102', '202', '312') THEN -li.qty
    ELSE 0
  END
`;

export const IN_QTY_SQL = `
  CASE
    WHEN d.movement_type = '101' THEN li.qty
    WHEN d.movement_type = '102' THEN -li.qty
    ELSE 0
  END
`;

export const OUT_QTY_SQL = `
  CASE
    WHEN d.movement_type = '201' THEN li.qty
    WHEN d.movement_type = '202' THEN -li.qty
    ELSE 0
  END
`;
