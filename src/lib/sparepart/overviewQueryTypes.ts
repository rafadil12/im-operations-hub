export type CountRow = { qty: number; docs: number };
export type NamedQty = { code: string; qty: number };
export type PeriodRow = { period_key: string; in_qty: number; out_qty: number };
export type DayCatRow = { day_key: string; category_code: string; qty: number };
export type DayRow = { day_key: string; qty: number };
export type LocRow = {
  location_id: number;
  code: string;
  name_en: string;
  name_cn: string;
  qty: number;
};
export type HeatRow = {
  category_code: string;
  location_id: number;
  location_name_en: string;
  location_name_cn: string;
  qty: number;
};
export type ItemRow = {
  code: string;
  name_en: string | null;
  name_cn: string | null;
  category_code: string;
  category_name_en: string | null;
  category_name_cn: string | null;
  uom_code: string | null;
  stock_current: number;
  min_stock: number;
};
export type UsedItemRow = {
  code: string;
  name_en: string | null;
  name_cn: string | null;
  category_code: string;
  category_name_en: string | null;
  category_name_cn: string | null;
  uom_code: string | null;
  qty: number;
};
export type ReconstructRow = {
  stock_current: number;
  min_stock: number;
  is_active: number | boolean;
  month_delta: number;
};
export type CatStatRow = {
  code: string;
  name_en: string;
  name_cn: string;
  item_count: number;
  stock_qty: number;
  low_count: number;
};
export type CatMoveRow = {
  code: string;
  movement_qty: number;
  net_qty: number;
};
