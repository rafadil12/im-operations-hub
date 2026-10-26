import { NextRequest, NextResponse } from "next/server";

import { attendanceSummary, dateInTimeZone, loadAttendanceRoster } from "@/lib/attendanceWeCom";
import { renderAttendanceRosterImage } from "@/lib/attendanceWeComImage";
import { sendAttendanceWeComImage } from "@/lib/attendanceWeComNotification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const secret = process.env.ATTENDANCE_CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const date = dateInTimeZone();
    const roster = await loadAttendanceRoster(date);
    const image = await renderAttendanceRosterImage(roster);
    await sendAttendanceWeComImage(image);

    return NextResponse.json({
      success: true,
      imageBytes: image.byteLength,
      summary: attendanceSummary(roster),
    });
  } catch (error) {
    console.error("GET /api/cron/attendance-wecom failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send attendance notification.",
      },
      { status: 500 }
    );
  }
}
