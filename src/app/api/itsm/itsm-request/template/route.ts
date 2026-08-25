import { NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { buildItsmImportTemplate } from "@/lib/itsm/requestImport";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.itsmRequestTemplate);
  if (gate instanceof NextResponse) return gate;

  try {
    const buffer = await buildItsmImportTemplate();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="itsm-requests-import-template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /itsm-request/template failed", error);
    return NextResponse.json({ error: "Failed to generate template." }, { status: 500 });
  }
}
