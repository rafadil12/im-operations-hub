import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import { getDict, localizedField, localizedName } from "@/lib/i18n";
import { buildMatDocListFilters } from "@/lib/sparepart/documentFilters";
import { movementLabel } from "@/lib/sparepart/documentDisplay";
import type { Lang, MovementType } from "@/lib/types";

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
  item_name_en: string | null;
  item_name_cn: string | null;
  item_brand_en: string | null;
  item_brand_cn: string | null;
  item_model: string | null;
  qty: number | null;
  from_location_code: string | null;
  from_location_name_en: string | null;
  from_location_name_cn: string | null;
  from_location_fallback: string | null;
  to_location_code: string | null;
  to_location_name_en: string | null;
  to_location_name_cn: string | null;
  line_note: string | null;
};

function parseLang(raw: string | null): Lang {
  return raw === "cn" ? "cn" : "en";
}

function formatPostingDate(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const match = raw.replace("T", " ").match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
  if (!match) return raw;
  return match[2] ? `${match[1]} ${match[2]}` : match[1];
}

function formatLocation(
  code: string | null | undefined,
  nameEn: string | null | undefined,
  nameCn: string | null | undefined,
  fallback: string | null | undefined,
  lang: Lang
): string {
  if (code) {
    const name = localizedName({ name_en: nameEn ?? null, name_cn: nameCn ?? null }, lang);
    return name && name !== "-" ? `${code} — ${name}` : code;
  }
  return fallback ?? "";
}

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartDocumentRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const lang = parseLang(request.nextUrl.searchParams.get("lang"));
    const dict = getDict(lang);
    const t = dict.sparepart;
    const { where, params } = buildMatDocListFilters(request.nextUrl.searchParams);

    const rows = await query<ExportRow[]>(
      `SELECT d.doc_number, d.movement_type, d.posting_date, d.recipient,
              d.header_text, d.created_by,
              li.line_no, li.qty, li.note AS line_note,
              i.code AS item_code,
              i.name_en AS item_name_en,
              i.name_cn AS item_name_cn,
              i.brand_en AS item_brand_en,
              i.brand_cn AS item_brand_cn,
              i.model AS item_model,
              loc_from.code AS from_location_code,
              loc_from.name_en AS from_location_name_en,
              loc_from.name_cn AS from_location_name_cn,
              li.storage_location AS from_location_fallback,
              loc_to.code AS to_location_code,
              loc_to.name_en AS to_location_name_en,
              loc_to.name_cn AS to_location_name_cn
       FROM sparepart_mat_docs d
       LEFT JOIN sparepart_mat_doc_items li ON li.doc_id = d.id
       LEFT JOIN sparepart_items i ON i.id = li.item_id
       LEFT JOIN sparepart_storage_locations loc_from
         ON loc_from.id = li.storage_location_id
       LEFT JOIN sparepart_storage_locations loc_to
         ON loc_to.id = li.to_storage_location_id
       ${where}
       ORDER BY d.posting_date DESC, d.id DESC, li.line_no ASC`,
      params
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(t.documentsTitle);
    const lineHeader = lang === "cn" ? "行号" : "Line";
    sheet.columns = [
      { header: t.docNumber, key: "doc_number", width: 18 },
      { header: t.movementType, key: "movement_type", width: 18 },
      { header: t.date, key: "posting_date", width: 20 },
      { header: t.recipient, key: "recipient", width: 22 },
      { header: t.headerText, key: "header_text", width: 28 },
      { header: lineHeader, key: "line_no", width: 8 },
      { header: t.item, key: "item_code", width: 14 },
      { header: t.name, key: "item_name", width: 32 },
      { header: t.brand, key: "item_brand", width: 16 },
      { header: t.model, key: "item_model", width: 22 },
      { header: t.qty, key: "qty", width: 10 },
      { header: t.fromLocation, key: "from_location", width: 28 },
      { header: t.toLocation, key: "to_location", width: 28 },
      { header: t.note, key: "line_note", width: 24 },
      { header: t.createdBy, key: "created_by", width: 18 },
    ];

    for (const row of rows) {
      sheet.addRow({
        doc_number: row.doc_number,
        movement_type: movementLabel(row.movement_type as MovementType, dict),
        posting_date: formatPostingDate(row.posting_date),
        recipient: row.recipient ?? "",
        header_text: row.header_text ?? "",
        line_no: row.line_no ?? "",
        item_code: row.item_code ?? "",
        item_name: localizedField(row.item_name_en, row.item_name_cn, lang),
        item_brand: localizedField(row.item_brand_en, row.item_brand_cn, lang),
        item_model: row.item_model ?? "",
        qty: row.qty ?? "",
        from_location: formatLocation(
          row.from_location_code,
          row.from_location_name_en,
          row.from_location_name_cn,
          row.from_location_fallback,
          lang
        ),
        to_location: formatLocation(
          row.to_location_code,
          row.to_location_name_en,
          row.to_location_name_cn,
          null,
          lang
        ),
        line_note: row.line_note ?? "",
        created_by: row.created_by ?? "",
      });
    }
    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="sparepart-transaction-history.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /sparepart/documents/export failed", error);
    return NextResponse.json({ error: "Failed to export documents." }, { status: 500 });
  }
}
