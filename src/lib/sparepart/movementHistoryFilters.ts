import { MAT_DOC_MOVEMENT_TYPES } from "@/lib/sparepart/documentFilters";
import type { MovementType } from "@/lib/types";

export const MOVEMENT_HISTORY_FROM = `
       FROM sparepart_mat_doc_items li
       JOIN sparepart_mat_docs d ON d.id = li.doc_id
       JOIN sparepart_items i ON i.id = li.item_id
       LEFT JOIN uoms u ON u.id = i.uom_id
       LEFT JOIN sparepart_storage_locations loc_from
         ON loc_from.id = li.storage_location_id
       LEFT JOIN sparepart_storage_locations loc_to
         ON loc_to.id = li.to_storage_location_id
       LEFT JOIN sparepart_stock_levels lvl_from
         ON lvl_from.id = li.storage_level_id
       LEFT JOIN sparepart_stock_levels lvl_to
         ON lvl_to.id = li.to_storage_level_id`;

export const MOVEMENT_HISTORY_SELECT = `SELECT d.id AS doc_id, d.doc_number, d.movement_type, d.posting_date,
              d.created_by,
              li.line_no, li.qty, li.note, li.item_id,
              i.code AS item_code,
              i.name_en AS item_name_en,
              i.name_cn AS item_name_cn,
              u.code AS uom_code,
              u.name_cn AS uom_name_cn,
              loc_from.code AS from_location_code,
              loc_from.name_en AS from_location_name_en,
              loc_from.name_cn AS from_location_name_cn,
              lvl_from.code AS from_level_code,
              lvl_from.name_en AS from_level_name_en,
              lvl_from.name_cn AS from_level_name_cn,
              loc_to.code AS to_location_code,
              loc_to.name_en AS to_location_name_en,
              loc_to.name_cn AS to_location_name_cn,
              lvl_to.code AS to_level_code,
              lvl_to.name_en AS to_level_name_en,
              lvl_to.name_cn AS to_level_name_cn`;

export const MOVEMENT_HISTORY_ORDER = `ORDER BY d.posting_date DESC, d.id DESC, li.line_no ASC`;

export function parseOptionalItemId(raw: string | null): number | null | "invalid" {
  const value = raw?.trim();
  if (!value) return null;
  const itemId = Number(value);
  if (!Number.isInteger(itemId) || itemId <= 0) return "invalid";
  return itemId;
}

export function buildMovementHistoryFilters(sp: URLSearchParams): {
  where: string;
  params: unknown[];
  itemIdError: boolean;
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const itemId = parseOptionalItemId(sp.get("item_id"));
  if (itemId === "invalid") {
    return { where: "", params: [], itemIdError: true };
  }
  if (itemId != null) {
    conditions.push("li.item_id = ?");
    params.push(itemId);
  }

  const movementType = sp.get("movementType")?.trim() as MovementType | "";
  if (movementType && MAT_DOC_MOVEMENT_TYPES.includes(movementType)) {
    conditions.push("d.movement_type = ?");
    params.push(movementType);
  }

  const start = sp.get("start")?.trim();
  const end = sp.get("end")?.trim();
  if (start) {
    conditions.push("d.posting_date >= ?");
    params.push(`${start} 00:00:00`);
  }
  if (end) {
    conditions.push("d.posting_date <= ?");
    params.push(`${end} 23:59:59`);
  }

  const q = sp.get("q")?.trim();
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      `(d.doc_number LIKE ?
          OR d.header_text LIKE ?
          OR d.recipient LIKE ?
          OR d.created_by LIKE ?
          OR i.code LIKE ?
          OR i.name_en LIKE ?
          OR i.name_cn LIKE ?
          OR li.note LIKE ?)`
    );
    params.push(like, like, like, like, like, like, like, like);
  }

  const location = sp.get("location")?.trim();
  if (location) {
    const like = `%${location}%`;
    conditions.push(
      `(li.storage_location LIKE ?
          OR loc_from.code = ?
          OR loc_from.name_en LIKE ?
          OR loc_from.name_cn LIKE ?
          OR loc_to.code = ?
          OR loc_to.name_en LIKE ?
          OR loc_to.name_cn LIKE ?)`
    );
    params.push(like, location, like, like, location, like, like);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
    itemIdError: false,
  };
}
