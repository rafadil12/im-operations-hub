import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import { localizedField, localizedName } from "@/lib/i18n";
import { stockLevelStatus } from "@/lib/sparepart/categories";
import {
  currentMonthBounds,
  formatStockReportDate,
  stockStatusReportHeaders,
  stockStatusReportStatusLabel,
} from "@/lib/sparepart/stockStatusReport";
import { contentDispositionAttachment, exportFilename } from "@/lib/exportFilenames";
import type { Lang } from "@/lib/types";

export const runtime = "nodejs";

type ReportRow = {
  code: string;
  name_en: string | null;
  name_cn: string | null;
  brand_en: string | null;
  brand_cn: string | null;
  model: string | null;
  stock_current: number;
  min_stock: number;
  is_active: number | boolean;
  category_code: string;
  category_name_en: string | null;
  category_name_cn: string | null;
  consumption_this_month: number | null;
  last_outbound_date: string | null;
};

function parseLang(raw: string | null): Lang {
  return raw === "cn" ? "cn" : "en";
}

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartMaterialsExport);
  if (gate instanceof NextResponse) return gate;

  try {
    const lang = parseLang(request.nextUrl.searchParams.get("lang"));
    const headers = stockStatusReportHeaders(lang);
    const { start, end } = currentMonthBounds();

    const rows = await query<ReportRow[]>(
      `SELECT
         i.code,
         i.name_en,
         i.name_cn,
         i.brand_en,
         i.brand_cn,
         i.model,
         i.stock_current,
         i.min_stock,
         i.is_active,
         c.code AS category_code,
         c.name_en AS category_name_en,
         c.name_cn AS category_name_cn,
         COALESCE(m.consumption_this_month, 0) AS consumption_this_month,
         m.last_outbound_date
       FROM sparepart_items i
       JOIN sparepart_categories c ON c.id = i.category_id
       LEFT JOIN (
         SELECT
           li.item_id,
           SUM(
             CASE
               WHEN d.movement_type = '201'
                 AND d.posting_date >= ?
                 AND d.posting_date <= ?
               THEN li.qty
               WHEN d.movement_type = '202'
                 AND d.posting_date >= ?
                 AND d.posting_date <= ?
               THEN -li.qty
               ELSE 0
             END
           ) AS consumption_this_month,
           MAX(CASE WHEN d.movement_type = '201' THEN d.posting_date END) AS last_outbound_date
         FROM sparepart_mat_doc_items li
         JOIN sparepart_mat_docs d ON d.id = li.doc_id
         WHERE d.movement_type IN ('201', '202')
         GROUP BY li.item_id
       ) m ON m.item_id = i.id
       WHERE i.deleted_at IS NULL
       ORDER BY i.code ASC`,
      [start, end, start, end]
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(lang === "cn" ? "库存状态" : "Stock status");
    sheet.columns = [
      { header: headers.category, key: "category", width: 14 },
      { header: headers.materialCode, key: "code", width: 14 },
      { header: headers.materialName, key: "name", width: 28 },
      { header: headers.brand, key: "brand", width: 16 },
      { header: headers.model, key: "model", width: 20 },
      { header: headers.consumptionThisMonth, key: "consumption_this_month", width: 16 },
      { header: headers.lastOutboundDate, key: "last_outbound_date", width: 16 },
      { header: headers.currentStock, key: "stock_current", width: 14 },
      { header: headers.minStock, key: "min_stock", width: 12 },
      { header: headers.stockStatus, key: "stock_status", width: 16 },
      { header: headers.amount, key: "amount", width: 12 },
    ];

    for (const row of rows) {
      const status = stockLevelStatus(row.min_stock, row.stock_current, row.is_active);
      const categoryLabel = localizedName(
        { name_en: row.category_name_en, name_cn: row.category_name_cn },
        lang
      );
      sheet.addRow({
        category: categoryLabel !== "-" ? categoryLabel : row.category_code,
        code: row.code,
        name: localizedField(row.name_en, row.name_cn, lang),
        brand: localizedField(row.brand_en, row.brand_cn, lang),
        model: row.model ?? "",
        consumption_this_month: Number(row.consumption_this_month ?? 0),
        last_outbound_date: formatStockReportDate(row.last_outbound_date, lang),
        stock_current: Number(row.stock_current ?? 0),
        min_stock: Number(row.min_stock ?? 0),
        stock_status: stockStatusReportStatusLabel(status, lang),
        amount: "",
      });
    }

    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = exportFilename("sparepartStockStatus", lang);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": contentDispositionAttachment(filename),
      },
    });
  } catch (error) {
    console.error("GET /sparepart/stock/export-report failed", error);
    return NextResponse.json({ error: "Failed to export stock status report." }, { status: 500 });
  }
}
