export type Lang = "en" | "cn";

export type Theme = "light" | "dark";

export type Division = {
  id: number;
  name_cn: string | null;
  name_en: string | null;
};

export type Category = {
  id: number;
  name_cn: string | null;
  name_en: string | null;
  division_id: number | null;
};

export type Subcategory = {
  id: number;
  category_id: number | null;
  name_cn: string | null;
  name_en: string | null;
};

export type User = {
  id: number;
  name_cn: string | null;
  name_en: string | null;
  division_id: number | null;
};

export type MesType = {
  id: number;
  name_cn: string | null;
  name_en: string | null;
};

export type MesStatus = {
  id: number;
  name_cn: string | null;
  name_en: string | null;
};

export type Masters = {
  divisions: Division[];
  categories: Category[];
  subcategories: Subcategory[];
  users: User[];
  types: MesType[];
  statuses: MesStatus[];
};

export type MesData = {
  id: number;
  user_id: number;
  division_id: number;
  category_id: number;
  subcategory_id: number;
  description_cn: string;
  description_en: string | null;
  solution_cn: string | null;
  solution_en: string | null;
  type_id: number;
  status_id: number;
  start_time: string;
  end_time: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type MesDataRow = MesData & {
  pic_en: string | null;
  pic_cn: string | null;
  division_en: string | null;
  division_cn: string | null;
  category_en: string | null;
  category_cn: string | null;
  subcategory_en: string | null;
  subcategory_cn: string | null;
  type_en: string | null;
  type_cn: string | null;
  status_en: string | null;
  status_cn: string | null;
};

export type MesDataInput = {
  user_id: number;
  division_id: number;
  category_id: number;
  subcategory_id: number;
  description_cn: string;
  description_en: string;
  solution_cn: string;
  solution_en: string;
  type_id: number;
  status_id: number;
  start_time: string;
  end_time: string;
};

export type CountItem = {
  label: string;
  count: number;
};

export type TrendItem = {
  date: string;
  count: number;
};

export type TopPicItem = {
  name: string;
  count: number;
};

export type NamedCount = {
  name_en: string | null;
  name_cn: string | null;
  count: number;
};

export type UserRankItem = {
  name_en: string | null;
  name_cn: string | null;
  division: string | null;
  count: number;
};

export type DurationPoint = {
  division: string | null;
  duration_hours: number;
};

export type AnalysisResult = {
  total: number;
  totalUsers: number;
  avgTasks: number;
  byStatus: NamedCount[];
  byCategory: NamedCount[];
  bySubcategory: NamedCount[];
  byDivision: NamedCount[];
  byType: NamedCount[];
  trend: TrendItem[];
  topPic: TopPicItem[];
  userRanking: UserRankItem[];
  durationPerDivision: DurationPoint[];
  avgDurationMinutes: number;
};

/** Match status counts by English name keywords (stable across locale). */
export function namedStatusCount(
  rows: NamedCount[],
  keyword: string,
): number {
  const key = keyword.toLowerCase();
  return (
    rows.find((s) => (s.name_en ?? "").toLowerCase().includes(key))?.count ?? 0
  );
}

/* ---- Sparepart / Inventory (SAP IM style) ---- */

export type MovementType =
  | "101"
  | "201"
  | "311"
  | "102"
  | "202"
  | "312";

export type SparepartStorageLocation = {
  id: number;
  code: string;
  name: string;
  is_active: number | boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type SparepartStockBalance = {
  id: number;
  item_id: number;
  storage_location_id: number;
  qty: number;
  location_code?: string;
  location_name?: string;
  updated_at?: string | null;
};

/** Stock overview row: one material with total qty across all locations */
export type SparepartStockBalanceRow = {
  item_id: number;
  code: string;
  name: string;
  brand: string | null;
  model: string | null;
  stock_current: number;
  stock_in: number;
  stock_out: number;
  notes: string | null;
  default_storage_location_id: number | null;
  default_location_name?: string | null;
};

export type SparepartItem = {
  id: number;
  code: string;
  name: string;
  brand: string | null;
  model: string | null;
  default_storage_location_id?: number | null;
  default_location_name?: string | null;
  stock_in: number;
  stock_out: number;
  stock_current: number;
  image_url: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  balances?: SparepartStockBalance[];
};

export type SparepartItemInput = {
  code: string;
  name: string;
  brand: string;
  model: string;
  default_storage_location_id?: number | null;
  notes: string;
};

export type SparepartMatDocLine = {
  id: number;
  doc_id: number;
  item_id: number;
  line_no: number;
  qty: number;
  storage_location: string | null;
  storage_location_id?: number | null;
  to_storage_location_id?: number | null;
  to_storage_location?: string | null;
  note: string | null;
  item_code?: string | null;
  item_name?: string | null;
  item_brand?: string | null;
  item_model?: string | null;
};

export type SparepartMatDoc = {
  id: number;
  doc_number: string;
  movement_type: MovementType;
  posting_date: string;
  header_text: string | null;
  recipient: string | null;
  created_by: string | null;
  client_request_id?: string | null;
  reversal_of_doc_id?: number | null;
  already_reversed?: boolean;
  created_at: string | null;
  line_count?: number;
  total_qty?: number;
  lines?: SparepartMatDocLine[];
};

export type SparepartGoodsMovementLineInput = {
  item_id: number;
  qty: number;
  note: string;
  storage_location_id: number;
  /** Required for 311 transfer */
  to_storage_location_id?: number;
};

export type SparepartGoodsMovementInput = {
  movement_type: MovementType;
  posting_date: string;
  header_text: string;
  recipient: string;
  lines: SparepartGoodsMovementLineInput[];
  created_by?: string;
  client_request_id?: string;
  reversal_of_doc_id?: number;
};
