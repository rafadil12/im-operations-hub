import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import type { MovementType } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

type HistoryRow = {
  doc_id: number;
  doc_number: string;
  movement_type: MovementType;
  posting_date: string;
  qty: number;
  note: string | null;
  created_by: string | null;
  from_location_id: number | null;
  from_location_code: string | null;
  from_location_name_en: string | null;
  from_location_name_cn: string | null;
  to_location_id: number | null;
  to_location_code: string | null;
  to_location_name_en: string | null;
  to_location_name_cn: string | null;
};

export async function GET(_request: NextRequest, context: Ctx) {
  const gate = await requireAnyPermission([
    PERMISSIONS.sparepartMaterialsRead,
    PERMISSIONS.sparepartStockView,
    PERMISSIONS.sparepartHistoryRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await context.params;
    const itemId = Number(id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "Invalid material id." }, { status: 400 });
    }

    const rows = await query<HistoryRow[]>(
      `SELECT d.id AS doc_id, d.doc_number, d.movement_type, d.posting_date,
              d.created_by, li.qty, li.note,
              loc_from.id AS from_location_id, loc_from.code AS from_location_code,
              loc_from.name_en AS from_location_name_en,
              loc_from.name_cn AS from_location_name_cn,
              loc_to.id AS to_location_id, loc_to.code AS to_location_code,
              loc_to.name_en AS to_location_name_en,
              loc_to.name_cn AS to_location_name_cn
       FROM sparepart_mat_doc_items li
       JOIN sparepart_mat_docs d ON d.id = li.doc_id
       LEFT JOIN sparepart_storage_locations loc_from ON loc_from.id = li.storage_location_id
       LEFT JOIN sparepart_storage_locations loc_to ON loc_to.id = li.to_storage_location_id
       WHERE li.item_id = ?
       ORDER BY d.posting_date ASC, d.id ASC, li.line_no ASC`,
      [itemId]
    );

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/materials/[id]/history failed", error);
    return NextResponse.json({ error: "Failed to load material history." }, { status: 500 });
  }
}
