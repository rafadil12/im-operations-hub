import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import type { SparepartMatDoc, SparepartMatDocLine } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
  const gate = await requirePermission(PERMISSIONS.sparepartDocumentRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await context.params;
    const docId = Number(id);

    const headers = await query<SparepartMatDoc[]>(
      `SELECT id, doc_number, movement_type, posting_date, header_text,
              recipient, created_by_system_user_id, created_by, created_at,
              client_request_id, reversal_of_doc_id
       FROM sparepart_mat_docs
       WHERE id = ?
       LIMIT 1`,
      [docId],
    );
    const header = headers[0];
    if (!header) {
      return NextResponse.json(
        { error: "Material document not found." },
        { status: 404 },
      );
    }

    const lines = await query<SparepartMatDocLine[]>(
      `SELECT li.id, li.doc_id, li.item_id, li.line_no, li.qty,
              li.storage_location, li.storage_location_id, li.to_storage_location_id,
              li.note,
              i.code AS item_code,
              COALESCE(i.name_en, i.name_cn) AS item_name,
              COALESCE(i.brand_en, i.brand_cn) AS item_brand,
              i.model AS item_model,
              CASE
                WHEN loc_from.id IS NOT NULL
                  THEN CONCAT(loc_from.code, ' — ', loc_from.name)
                ELSE NULL
              END AS from_storage_location,
              CASE
                WHEN loc_to.id IS NOT NULL
                  THEN CONCAT(loc_to.code, ' — ', loc_to.name)
                ELSE NULL
              END AS to_storage_location
       FROM sparepart_mat_doc_items li
       JOIN sparepart_items i ON i.id = li.item_id
       LEFT JOIN sparepart_storage_locations loc_from
         ON loc_from.id = li.storage_location_id
       LEFT JOIN sparepart_storage_locations loc_to
         ON loc_to.id = li.to_storage_location_id
       WHERE li.doc_id = ?
       ORDER BY li.line_no ASC`,
      [docId],
    );

    const alreadyReversed = await query<{ id: number }[]>(
      `SELECT id FROM sparepart_mat_docs WHERE reversal_of_doc_id = ? LIMIT 1`,
      [docId],
    );

    return NextResponse.json({
      document: {
        ...header,
        lines,
        already_reversed: Boolean(alreadyReversed[0]),
      },
    });
  } catch (error) {
    console.error("GET /sparepart/documents/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to load material document." },
      { status: 500 },
    );
  }
}
