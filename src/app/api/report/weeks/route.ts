import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { jsonError, parseYear } from "@/lib/report/apiHelpers";
import { loadReportWeeks } from "@/lib/report/lineStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.reportOverviewView,
    PERMISSIONS.reportLineRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const year = parseYear(searchParams.get("year")) ?? undefined;
    const weeks = await loadReportWeeks(year);
    return NextResponse.json({ success: true, data: weeks });
  } catch (error) {
    console.error("GET /api/report/weeks ERROR:", error);
    return jsonError("Failed to load report weeks.", 500);
  }
}
