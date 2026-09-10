import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { jsonError, parsePositiveInt } from "@/lib/report/apiHelpers";
import { createReportSubItem } from "@/lib/report/lineStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.reportLineCreate,
    PERMISSIONS.reportLineUpdate,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await request.json();
    const areaId = parsePositiveInt(String(body.areaId ?? ""));
    const nameEn = String(body.nameEn ?? "").trim();
    const nameCn = String(body.nameCn ?? "").trim();

    if (!areaId) return jsonError("areaId is required.");
    if (!nameEn) return jsonError("English name is required.");
    if (!nameCn) return jsonError("Chinese name is required.");

    const created = await createReportSubItem(areaId, nameEn, nameCn);
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error("POST /api/report/sub-items ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to create sub-item.";
    return jsonError(message, 400);
  }
}
