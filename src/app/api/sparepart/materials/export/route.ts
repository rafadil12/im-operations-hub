import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { query } from "@/lib/db";
import type { SparepartItem } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await query<SparepartItem[]>(
      `SELECT code, name, brand, model, location,
              stock_in, stock_out, stock_current, notes
       FROM sparepart_items
       WHERE deleted_at IS NULL
       ORDER BY code ASC`,
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("IT Stock");
    sheet.columns = [
      { header: "Kode Barang", key: "code", width: 14 },
      { header: "Nama Barang", key: "name", width: 32 },
      { header: "Brand", key: "brand", width: 16 },
      { header: "Model", key: "model", width: 28 },
      { header: "Lokasi", key: "location", width: 20 },
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
        location: row.location ?? "",
        stock_in: row.stock_in,
        stock_out: row.stock_out,
        stock_current: row.stock_current,
        notes: row.notes ?? "",
      });
    }

    sheet.getRow(1).font = { bold: true };

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
