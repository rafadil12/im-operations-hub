import { NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { buildActivitiesTemplate } from "@/lib/mesRecordImport";
import { loadMasters } from "@/lib/masters";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.dailyRecordTemplate);
  if (gate instanceof NextResponse) return gate;

  try {
    const masters = await loadMasters();
    const buffer = await buildActivitiesTemplate(masters);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="daily-activities-template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /mes-record/template failed", error);
    return NextResponse.json(
      { error: "Failed to generate template." },
      { status: 500 },
    );
  }
}
