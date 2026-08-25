export type SparepartMostUsedItem = {
  code: string;
  name_en: string;
  name_cn: string;
  qty: number;
};

export type SparepartUsedTrendPoint = {
  date: string;
  current: number;
  previous: number;
};

export type SparepartAnalysisResult = {
  totalItems: number;
  zeroStock: number;
  usageThisMonth: number;
  usageThisYear: number;
  mostUsed: SparepartMostUsedItem[];
  usedTrend: SparepartUsedTrendPoint[];
};

export type SparepartAnalysisResponse = {
  result: SparepartAnalysisResult;
  range: { start: string; end: string };
};

/* ---- Sparepart / Inventory (SAP IM style) ---- */

export type MovementType = "101" | "201" | "311" | "102" | "202" | "312";

export type SparepartCategoryCode = "IT" | "AGV" | "ASSEMBLY" | "MES";

export type SparepartCategory = {
  id: number;
  code: string;
  name_en: string;
  name_cn: string;
  sort_order: number;
  is_active: number | boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SparepartUom = {
  id: number;
  code: string;
  name_en: string;
  name_cn: string;
  sort_order: number;
  is_active: number | boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SparepartStorageLocation = {
  id: number;
  code: string;
  name_en: string;
  name_cn: string;
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
  location_name_en?: string | null;
  location_name_cn?: string | null;
  updated_at?: string | null;
};

/** Stock overview row: one material with total qty across all locations */
export type SparepartStockBalanceRow = {
  item_id: number;
  code: string;
  name_en: string | null;
  name_cn: string | null;
  brand_en: string | null;
  brand_cn: string | null;
  model: string | null;
  stock_current: number;
  min_stock: number;
  is_active: number | boolean;
  category_id: number;
  category_code: string | null;
  category_name_en: string | null;
  category_name_cn: string | null;
  uom_id?: number;
  uom_code?: string | null;
  notes: string | null;
};

export type SparepartItem = {
  id: number;
  code: string;
  name_en: string | null;
  name_cn: string | null;
  brand_en: string | null;
  brand_cn: string | null;
  model: string | null;
  stock_current: number;
  min_stock: number;
  is_active: number | boolean;
  category_id: number;
  category_code?: string | null;
  category_name_en?: string | null;
  category_name_cn?: string | null;
  uom_id: number;
  uom_code?: string | null;
  uom_name_en?: string | null;
  uom_name_cn?: string | null;
  image_url: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  balances?: SparepartStockBalance[];
};

export type SparepartItemInput = {
  code: string;
  name_en: string;
  name_cn: string;
  brand_en: string;
  brand_cn: string;
  model: string;
  notes: string;
  category_id: number;
  uom_id: number;
  min_stock: number;
  is_active: boolean;
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
  /** Joined label for storage_location_id */
  from_storage_location?: string | null;
  from_location_code?: string | null;
  from_location_name_en?: string | null;
  from_location_name_cn?: string | null;
  /** Joined label for to_storage_location_id */
  to_storage_location?: string | null;
  to_location_code?: string | null;
  to_location_name_en?: string | null;
  to_location_name_cn?: string | null;
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
  created_by_system_user_id?: number | null;
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
  created_by_system_user_id?: number;
  created_by?: string;
  client_request_id?: string;
  reversal_of_doc_id?: number;
};
