export const STOCK_BALANCE_SELECT = `
  b.id, b.item_id, b.storage_location_id, b.level_id, b.qty, b.updated_at,
  loc.code AS location_code,
  loc.name_en AS location_name_en,
  loc.name_cn AS location_name_cn,
  loc.name_en AS location_name,
  lvl.code AS level_code,
  lvl.name_en AS level_name_en,
  lvl.name_cn AS level_name_cn
`;

export const STOCK_BALANCE_FROM = `
  sparepart_stock_balances b
  JOIN sparepart_storage_locations loc ON loc.id = b.storage_location_id
  JOIN sparepart_stock_levels lvl ON lvl.id = b.level_id
`;
