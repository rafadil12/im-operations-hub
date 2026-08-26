import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { jsonError } from "@/lib/training/apiHelpers";
import { computeTrainingOverviewMetrics } from "@/lib/training/overviewMetrics";
import { loadTrainingSessions } from "@/lib/training/sessionStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.trainingOverviewView,
    PERMISSIONS.trainingSessionRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const monthRaw = searchParams.get("month");
    const month = monthRaw == null || monthRaw === "" ? null : Number(monthRaw);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return jsonError("Invalid year.");
    }

    if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) {
      return jsonError("Invalid month.");
    }

    const sessions = await loadTrainingSessions({ year });
    const metrics = computeTrainingOverviewMetrics({ sessions, year, month });

    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error("GET /api/training/overview ERROR:", error);
    return jsonError("Failed to load training overview.", 500);
  }
}
