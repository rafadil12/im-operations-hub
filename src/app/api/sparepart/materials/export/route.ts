import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { query } from "@/lib/db";
import type { SparepartItem } from "@/lib/types";

export const runtime = "nodejs";

type BalanceExportRow = {
  code: string;
  name: string;
  brand: string | null;
  model: string | null;
  location_code: string;
  location_name: string;
  qty: number;
};

export async function GET() {
  try {
    const rows = await query<
      (Pick<
        SparepartItem,
        "code" | "name" | "brand" | "model" | "stock_in" | "stock_out" | "stock_current" | "notes"
      > & { default_location_name: string | null })[]
    >(
      `SELECT i.code, i.name, i.brand, i.model,
              dloc.name AS default_location_name,
              i.stock_in, i.stock_out, i.stock_current, i.notes
       FROM sparepart_items i
       LEFT JOIN sparepart_storage_locations dloc ON dloc.id = i.default_storage_location_id
       WHERE i.deleted_at IS NULL
       ORDER BY i.code ASC`,
    );

    const balanceRows = await query<BalanceExportRow[]>(
      `SELECT i.code, i.name, i.brand, i.model,
              loc.code AS location_code, loc.name AS location_name, b.qty
       FROM sparepart_stock_balances b
       JOIN sparepart_items i ON i.id = b.item_id
       JOIN sparepart_storage_locations loc ON loc.id = b.storage_location_id
       WHERE i.deleted_at IS NULL
       ORDER BY i.code ASC, loc.name ASC`,
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("IT Stock");
    sheet.columns = [
      { header: "Kode Barang", key: "code", width: 14 },
      { header: "Nama Barang", key: "name", width: 32 },
      { header: "Brand", key: "brand", width: 16 },
      { header: "Model", key: "model", width: 28 },
      { header: "Default Lokasi", key: "location", width: 20 },
      { header: "Stok Masuk", key: "stock_in", width: 12 },
      { header: "Stok Keluar", key: "stock_out", width: 12 },
      { header: "Stok Sekarang", key: "stock_current", width: 14 },
      { header: "Notes", key: "notes", width: 24 },
    ];

    for (const row of rows) {
      sheet.addRow({
        code: row.code,
        name: row.name,
        brand: row.brand ?? "",
        model: row.model ?? "",
        location: row.default_location_name ?? "",
        stock_in: row.stock_in,
        stock_out: row.stock_out,
        stock_current: row.stock_current,
        notes: row.notes ?? "",
      });
    }
    sheet.getRow(1).font = { bold: true };

    const byLoc = workbook.addWorksheet("Stock by Location");
    byLoc.columns = [
      { header: "Kode Barang", key: "code", width: 14 },
      { header: "Nama Barang", key: "name", width: 32 },
      { header: "Brand", key: "brand", width: 16 },
      { header: "Model", key: "model", width: 28 },
      { header: "Location Code", key: "location_code", width: 16 },
      { header: "Location Name", key: "location_name", width: 20 },
      { header: "Qty", key: "qty", width: 10 },
    ];
    for (const row of balanceRows) {
      byLoc.addRow({
        code: row.code,
        name: row.name,
        brand: row.brand ?? "",
        model: row.model ?? "",
        location_code: row.location_code,
        location_name: row.location_name,
        qty: row.qty,
      });
    }
    byLoc.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="sparepart-export.xlsx"`,
      },
    });
  } catch (error) {
    console.error("GET /sparepart/materials/export failed", error);
    return NextResponse.json(
      { error: "Failed to export materials." },
      { status: 500 },
    );
  }
}
