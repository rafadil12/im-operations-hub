import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { formatDateOnly, resolveRange, toDateInput } from "@/lib/dateRange";
import { jsonError } from "@/lib/training/apiHelpers";
import { computeTrainingOverviewMetrics } from "@/lib/training/overviewMetrics";
import { loadTrainingDivisions, loadTrainingSessions } from "@/lib/training/sessionStore";

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
    const fallbackStart = formatDateOnly(new Date(now.getFullYear(), 0, 1));
    const fallbackEnd = formatDateOnly(now);

    const startRaw = searchParams.get("start") ?? fallbackStart;
    const endRaw = searchParams.get("end") ?? fallbackEnd;
    const range = resolveRange(startRaw, endRaw);
    const startDate = toDateInput(range.start);
    const endDate = toDateInput(range.end);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return jsonError("Invalid date range.");
    }

    if (startDate > endDate) {
      return jsonError("Start date must be on or before end date.");
    }

    const [sessions, divisions] = await Promise.all([
      loadTrainingSessions({ startDate, endDate }),
      loadTrainingDivisions(),
    ]);
    const metrics = computeTrainingOverviewMetrics({
      sessions,
      divisions,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error("GET /api/training/overview ERROR:", error);
    return jsonError("Failed to load training overview.", 500);
  }
}
