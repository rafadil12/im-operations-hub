import { NextResponse } from "next/server";
import { buildItsmImportTemplate } from "@/lib/itsmRequestImport";

export const runtime = "nodejs";

export async function GET() {
  try {
    const buffer = await buildItsmImportTemplate();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="itsm-requests-import-template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /itsm-request/template failed", error);
    return NextResponse.json(
      { error: "Failed to generate template." },
      { status: 500 },
    );
  }
}
