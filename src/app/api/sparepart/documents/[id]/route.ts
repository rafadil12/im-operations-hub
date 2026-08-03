import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { SparepartMatDoc, SparepartMatDocLine } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;
    const docId = Number(id);

    const headers = await query<SparepartMatDoc[]>(
      `SELECT id, doc_number, movement_type, posting_date, header_text,
              recipient, created_by, created_at
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
              li.storage_location, li.note,
              i.code AS item_code, i.name AS item_name,
              i.brand AS item_brand, i.model AS item_model
       FROM sparepart_mat_doc_items li
       JOIN sparepart_items i ON i.id = li.item_id
       WHERE li.doc_id = ?
       ORDER BY li.line_no ASC`,
      [docId],
    );

    return NextResponse.json({
      document: { ...header, lines },
    });
  } catch (error) {
    console.error("GET /sparepart/documents/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to load material document." },
      { status: 500 },
    );
  }
}
