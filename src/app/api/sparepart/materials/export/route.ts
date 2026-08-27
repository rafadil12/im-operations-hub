import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import { getDict, localizedField, localizedName } from "@/lib/i18n";
import type { Lang, SparepartItem } from "@/lib/types";

export const runtime = "nodejs";

type BalanceExportRow = {
  code: string;
  name_en: string | null;
  name_cn: string | null;
  brand_en: string | null;
  brand_cn: string | null;
  model: string | null;
  location_code: string;
  location_name_en: string;
  location_name_cn: string;
  qty: number;
};

function parseLang(raw: string | null): Lang {
  return raw === "cn" ? "cn" : "en";
}

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartMaterialsExport);
  if (gate instanceof NextResponse) return gate;

  try {
    const lang = parseLang(request.nextUrl.searchParams.get("lang"));
    const t = getDict(lang).sparepart;

    const rows = await query<
      (Pick<
        SparepartItem,
        | "code"
        | "name_en"
        | "name_cn"
        | "brand_en"
        | "brand_cn"
        | "model"
        | "stock_current"
        | "min_stock"
        | "notes"
      > & { category_code: string; uom_code: string })[]
    >(
      `SELECT i.code, i.name_en, i.name_cn, i.brand_en, i.brand_cn, i.model,
              i.stock_current, i.min_stock, i.notes, c.code AS category_code,
              u.code AS uom_code
       FROM sparepart_items i
       JOIN sparepart_categories c ON c.id = i.category_id
       JOIN uoms u ON u.id = i.uom_id
       WHERE i.deleted_at IS NULL
       ORDER BY i.code ASC`
    );

    const balanceRows = await query<BalanceExportRow[]>(
      `SELECT i.code, i.name_en, i.name_cn, i.brand_en, i.brand_cn, i.model,
              loc.code AS location_code,
              loc.name_en AS location_name_en,
              loc.name_cn AS location_name_cn,
              b.qty
       FROM sparepart_stock_balances b
       JOIN sparepart_items i ON i.id = b.item_id
       JOIN sparepart_storage_locations loc ON loc.id = b.storage_location_id
       WHERE i.deleted_at IS NULL AND b.qty > 0
       ORDER BY i.code ASC, loc.name_en ASC`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(t.materialsTitle);
    sheet.columns = [
      { header: t.alertColCode, key: "code", width: 14 },
      { header: t.name, key: "name", width: 32 },
      { header: t.brand, key: "brand", width: 16 },
      { header: t.model, key: "model", width: 28 },
      { header: t.category, key: "category", width: 12 },
      { header: t.minStock, key: "min_stock", width: 12 },
      { header: t.uom, key: "uom", width: 10 },
      { header: t.stockCurrent, key: "stock_current", width: 14 },
      { header: t.notes, key: "notes", width: 24 },
    ];

    for (const row of rows) {
      sheet.addRow({
        code: row.code,
        name: localizedField(row.name_en, row.name_cn, lang),
        brand: localizedField(row.brand_en, row.brand_cn, lang),
        model: row.model ?? "",
        category: row.category_code,
        min_stock: row.min_stock,
        uom: row.uom_code,
        stock_current: row.stock_current,
        notes: row.notes ?? "",
      });
    }
    sheet.getRow(1).font = { bold: true };

    const byLoc = workbook.addWorksheet(t.stockByLocation);
    byLoc.columns = [
      { header: t.alertColCode, key: "code", width: 14 },
      { header: t.name, key: "name", width: 32 },
      { header: t.brand, key: "brand", width: 16 },
      { header: t.model, key: "model", width: 28 },
      { header: t.locationCode, key: "location_code", width: 16 },
      { header: t.locationName, key: "location_name", width: 20 },
      { header: t.qty, key: "qty", width: 10 },
    ];
    for (const row of balanceRows) {
      byLoc.addRow({
        code: row.code,
        name: localizedField(row.name_en, row.name_cn, lang),
        brand: localizedField(row.brand_en, row.brand_cn, lang),
        model: row.model ?? "",
        location_code: row.location_code,
        location_name: localizedName(
          { name_en: row.location_name_en, name_cn: row.location_name_cn },
          lang
        ),
        qty: row.qty,
      });
    }
    byLoc.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="sparepart-export.xlsx"`,
      },
    });
  } catch (error) {
    console.error("GET /sparepart/materials/export failed", error);
    return NextResponse.json({ error: "Failed to export materials." }, { status: 500 });
  }
}
