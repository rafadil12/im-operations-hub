import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { SparepartMatDoc } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const conditions: string[] = [];
    const params: unknown[] = [];

    const movementType = sp.get("movementType")?.trim();
    if (movementType === "101" || movementType === "201") {
      conditions.push("d.movement_type = ?");
      params.push(movementType);
    }

    const start = sp.get("start");
    const end = sp.get("end");
    if (start) {
      conditions.push("d.posting_date >= ?");
      params.push(start);
    }
    if (end) {
      conditions.push("d.posting_date <= ?");
      params.push(end);
    }

    const q = sp.get("q")?.trim();
    if (q) {
      conditions.push(
        "(d.doc_number LIKE ? OR d.header_text LIKE ? OR d.recipient LIKE ?)",
      );
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const rows = await query<SparepartMatDoc[]>(
      `SELECT d.id, d.doc_number, d.movement_type, d.posting_date,
              d.header_text, d.recipient, d.created_by, d.created_at,
              COUNT(li.id) AS line_count,
              COALESCE(SUM(li.qty), 0) AS total_qty
       FROM sparepart_mat_docs d
       LEFT JOIN sparepart_mat_doc_items li ON li.doc_id = d.id
       ${where}
       GROUP BY d.id
       ORDER BY d.posting_date DESC, d.id DESC`,
      params,
    );

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/documents failed", error);
    return NextResponse.json(
      { error: "Failed to load material documents." },
      { status: 500 },
    );
  }
}
