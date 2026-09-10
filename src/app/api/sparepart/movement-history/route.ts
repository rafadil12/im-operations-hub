import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import type { SparepartMovementHistoryRow } from "@/lib/types";

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartDocumentRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const itemId = Number(request.nextUrl.searchParams.get("item_id"));
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "item_id is required." }, { status: 400 });
    }

    const rows = await query<SparepartMovementHistoryRow[]>(
      `SELECT d.id AS doc_id, d.doc_number, d.movement_type, d.posting_date,
              li.line_no, li.qty, li.note, li.item_id,
              i.code AS item_code,
              i.name_en AS item_name_en,
              i.name_cn AS item_name_cn,
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
              lvl_to.name_cn AS to_level_name_cn
       FROM sparepart_mat_doc_items li
       JOIN sparepart_mat_docs d ON d.id = li.doc_id
       JOIN sparepart_items i ON i.id = li.item_id
       LEFT JOIN sparepart_storage_locations loc_from
         ON loc_from.id = li.storage_location_id
       LEFT JOIN sparepart_storage_locations loc_to
         ON loc_to.id = li.to_storage_location_id
       LEFT JOIN sparepart_stock_levels lvl_from
         ON lvl_from.id = li.storage_level_id
       LEFT JOIN sparepart_stock_levels lvl_to
         ON lvl_to.id = li.to_storage_level_id
       WHERE li.item_id = ?
       ORDER BY d.posting_date DESC, d.id DESC, li.line_no ASC`,
      [itemId]
    );

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/movement-history failed", error);
    return NextResponse.json({ error: "Failed to load movement history." }, { status: 500 });
  }
}
