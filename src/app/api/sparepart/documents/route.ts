import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import { buildMatDocListFilters } from "@/lib/sparepart/documentFilters";
import type { SparepartMatDoc } from "@/lib/types";

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartDocumentRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const { where, params } = buildMatDocListFilters(request.nextUrl.searchParams);

    const rows = await query<SparepartMatDoc[]>(
      `SELECT d.id, d.doc_number, d.movement_type, d.posting_date,
              d.header_text, d.recipient, d.created_by_system_user_id,
              d.created_by, d.created_at,
              d.client_request_id, d.reversal_of_doc_id,
              COUNT(li.id) AS line_count,
              COALESCE(SUM(li.qty), 0) AS total_qty
       FROM sparepart_mat_docs d
       LEFT JOIN sparepart_mat_doc_items li ON li.doc_id = d.id
       ${where}
       GROUP BY d.id
       ORDER BY d.posting_date DESC, d.id DESC`,
      params
    );

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/documents failed", error);
    return NextResponse.json({ error: "Failed to load material documents." }, { status: 500 });
  }
}
