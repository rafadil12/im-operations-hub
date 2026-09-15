import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import { getDict, localizedField } from "@/lib/i18n";
import { appendLevelLabel, formatLocationLabel, movementLabel } from "@/lib/sparepart/documentDisplay";
import {
  MOVEMENT_HISTORY_FROM,
  MOVEMENT_HISTORY_ORDER,
  MOVEMENT_HISTORY_SELECT,
  buildMovementHistoryFilters,
} from "@/lib/sparepart/movementHistoryFilters";
import type { Lang, MovementType, SparepartMovementHistoryRow } from "@/lib/types";

export const runtime = "nodejs";

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

function locationCell(row: SparepartMovementHistoryRow, side: "from" | "to", lang: Lang): string {
  const label =
    side === "from"
      ? appendLevelLabel(
          formatLocationLabel(
            row.from_location_code,
            row.from_location_name_en,
            row.from_location_name_cn,
            lang
          ),
          row.from_level_code,
          row.from_level_name_en,
          row.from_level_name_cn,
          lang
        )
      : appendLevelLabel(
          formatLocationLabel(
            row.to_location_code,
            row.to_location_name_en,
            row.to_location_name_cn,
            lang
          ),
          row.to_level_code,
          row.to_level_name_en,
          row.to_level_name_cn,
          lang
        );
  return !label || label === "-" ? "" : label;
}

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartDocumentRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const lang = parseLang(request.nextUrl.searchParams.get("lang"));
    const dict = getDict(lang);
    const t = dict.sparepart;
    const { where, params, itemIdError } = buildMovementHistoryFilters(request.nextUrl.searchParams);
    if (itemIdError) {
      return NextResponse.json({ error: "item_id is invalid." }, { status: 400 });
    }

    const rows = await query<SparepartMovementHistoryRow[]>(
      `${MOVEMENT_HISTORY_SELECT}
       ${MOVEMENT_HISTORY_FROM}
       ${where}
       ${MOVEMENT_HISTORY_ORDER}`,
      params
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(t.movementHistoryTitle);
    sheet.columns = [
      { header: t.date, key: "posting_date", width: 20 },
      { header: t.docNumber, key: "doc_number", width: 18 },
      { header: t.lineNo, key: "line_no", width: 8 },
      { header: t.code, key: "item_code", width: 14 },
      { header: t.name, key: "item_name", width: 32 },
      { header: t.movementType, key: "movement_type", width: 18 },
      { header: t.qty, key: "qty", width: 10 },
      { header: t.uom, key: "uom", width: 10 },
      { header: t.fromLocation, key: "from_location", width: 28 },
      { header: t.toLocation, key: "to_location", width: 28 },
      { header: t.createdBy, key: "created_by", width: 18 },
      { header: t.note, key: "note", width: 24 },
    ];

    for (const row of rows) {
      sheet.addRow({
        posting_date: formatPostingDate(row.posting_date),
        doc_number: row.doc_number,
        line_no: row.line_no,
        item_code: row.item_code,
        item_name: localizedField(row.item_name_en, row.item_name_cn, lang),
        movement_type: movementLabel(row.movement_type as MovementType, dict),
        qty: row.qty,
        uom: row.uom_code ?? "",
        from_location: locationCell(row, "from", lang),
        to_location: locationCell(row, "to", lang),
        created_by: row.created_by ?? "",
        note: row.note ?? "",
      });
    }
    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="sparepart-movement-history.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /sparepart/movement-history/export failed", error);
    return NextResponse.json({ error: "Failed to export movement history." }, { status: 500 });
  }
}
