import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.sparepartMaterialsTemplate);
  if (gate instanceof NextResponse) return gate;

  try {
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
    sheet.addRow({
      code: "IT00001",
      name: "Switch",
      brand: "TP-LINK",
      model: "TL-SF1016DS",
      location: "Server Room",
      stock_in: 1,
      stock_out: 0,
      stock_current: 1,
      notes: "",
    });
    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="sparepart-template.xlsx"',
      },
    });
  } catch (error) {
    console.error("GET /sparepart/materials/template failed", error);
    return NextResponse.json(
      { error: "Failed to download template." },
      { status: 500 },
    );
  }
}
