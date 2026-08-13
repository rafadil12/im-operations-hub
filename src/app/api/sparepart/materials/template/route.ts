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
    const sheet = workbook.addWorksheet("Items");
    sheet.columns = [
      { header: "Code", key: "code", width: 14 },
      { header: "Name EN", key: "name_en", width: 32 },
      { header: "Name CN", key: "name_cn", width: 32 },
      { header: "Brand EN", key: "brand_en", width: 16 },
      { header: "Brand CN", key: "brand_cn", width: 16 },
      { header: "Model", key: "model", width: 28 },
      { header: "Category", key: "category", width: 12 },
      { header: "Min Stock", key: "min_stock", width: 12 },
      { header: "Notes", key: "notes", width: 24 },
    ];
    sheet.addRow({
      code: "IT00001",
      name_en: "Switch",
      name_cn: "交换机",
      brand_en: "TP-LINK",
      brand_cn: "TP-LINK",
      model: "TL-SF1016DS",
      category: "IT",
      min_stock: 0,
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
