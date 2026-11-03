import { NextRequest, NextResponse } from "next/server";

import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { syncDailyAttendance } from "@/lib/organization/syncDailyAttendance";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.organizationAttendanceManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      year?: unknown;
      month?: unknown;
    };
    const now = new Date();
    const year = body.year === undefined ? now.getFullYear() : Number(body.year);
    const month = body.month === undefined ? now.getMonth() + 1 : Number(body.month);
    const summary = await syncDailyAttendance(year, month, now);

    return NextResponse.json({
      success: true,
      message: "Daily attendance synchronized successfully.",
      summary,
    });
  } catch (error) {
    console.error("POST /api/organization/attendance/daily/sync failed:", error);
    const message = error instanceof Error ? error.message : "Failed to synchronize daily attendance.";
    const status = message.startsWith("year must") || message.startsWith("month must") ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
