import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import {
  buildMatDocListFilters,
  movementTypeLabel,
} from "@/lib/sparepartDocumentFilters";

export const runtime = "nodejs";

type ExportRow = {
  doc_number: string;
  movement_type: string;
  posting_date: string;
  recipient: string | null;
  header_text: string | null;
  created_by: string | null;
  line_no: number | null;
  item_code: string | null;
  item_name: string | null;
  item_brand: string | null;
  item_model: string | null;
  qty: number | null;
  from_location: string | null;
  to_location: string | null;
  line_note: string | null;
};

function formatPostingDate(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const match = raw.replace("T", " ").match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
  if (!match) return raw;
  return match[2] ? `${match[1]} ${match[2]}` : match[1];
}

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartDocumentRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const { where, params } = buildMatDocListFilters(request.nextUrl.searchParams);

    const rows = await query<ExportRow[]>(
      `SELECT d.doc_number, d.movement_type, d.posting_date, d.recipient,
              d.header_text, d.created_by,
              li.line_no, li.qty, li.note AS line_note,
              i.code AS item_code,
              COALESCE(i.name_en, i.name_cn) AS item_name,
              COALESCE(i.brand_en, i.brand_cn) AS item_brand,
              i.model AS item_model,
              CASE
                WHEN loc_from.id IS NOT NULL
                  THEN CONCAT(loc_from.code, ' — ', loc_from.name)
                ELSE COALESCE(li.storage_location, '')
              END AS from_location,
              CASE
                WHEN loc_to.id IS NOT NULL
                  THEN CONCAT(loc_to.code, ' — ', loc_to.name)
                ELSE NULL
              END AS to_location
       FROM sparepart_mat_docs d
       LEFT JOIN sparepart_mat_doc_items li ON li.doc_id = d.id
       LEFT JOIN sparepart_items i ON i.id = li.item_id
       LEFT JOIN sparepart_storage_locations loc_from
         ON loc_from.id = li.storage_location_id
       LEFT JOIN sparepart_storage_locations loc_to
         ON loc_to.id = li.to_storage_location_id
       ${where}
       ORDER BY d.posting_date DESC, d.id DESC, li.line_no ASC`,
      params,
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Transaction History");
    sheet.columns = [
      { header: "Document", key: "doc_number", width: 18 },
      { header: "Transaction Type", key: "movement_type", width: 18 },
      { header: "Posting Date", key: "posting_date", width: 20 },
      { header: "Issued To", key: "recipient", width: 22 },
      { header: "Transaction Note", key: "header_text", width: 28 },
      { header: "Line", key: "line_no", width: 8 },
      { header: "Material", key: "item_code", width: 14 },
      { header: "Description", key: "item_name", width: 32 },
      { header: "Brand", key: "item_brand", width: 16 },
      { header: "Model", key: "item_model", width: 22 },
      { header: "Qty", key: "qty", width: 10 },
      { header: "From Location", key: "from_location", width: 28 },
      { header: "To Location", key: "to_location", width: 28 },
      { header: "Line Note", key: "line_note", width: 24 },
      { header: "Created By", key: "created_by", width: 18 },
    ];

    for (const row of rows) {
      sheet.addRow({
        doc_number: row.doc_number,
        movement_type: movementTypeLabel(row.movement_type),
        posting_date: formatPostingDate(row.posting_date),
        recipient: row.recipient ?? "",
        header_text: row.header_text ?? "",
        line_no: row.line_no ?? "",
        item_code: row.item_code ?? "",
        item_name: row.item_name ?? "",
        item_brand: row.item_brand ?? "",
        item_model: row.item_model ?? "",
        qty: row.qty ?? "",
        from_location: row.from_location ?? "",
        to_location: row.to_location ?? "",
        line_note: row.line_note ?? "",
        created_by: row.created_by ?? "",
      });
    }
    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="sparepart-transaction-history.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /sparepart/documents/export failed", error);
    return NextResponse.json(
      { error: "Failed to export documents." },
      { status: 500 },
    );
  }
}
