import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { jsonError, parseWeekNumber, parseYear } from "@/lib/report/apiHelpers";
import { listProjectReports, createProjectReport, getProjectReportById } from "@/lib/report/projectStore";
import { parseProjectPayload } from "@/lib/report/projectValidation";

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.reportProjectRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = request.nextUrl;
    const year = parseYear(searchParams.get("year"));
    const weekNumber = parseWeekNumber(searchParams.get("week"));
    const q = searchParams.get("q")?.trim() || undefined;

    if (searchParams.get("year") && year == null) {
      return jsonError("Invalid year.");
    }
    if (searchParams.get("week") && weekNumber == null) {
      return jsonError("Invalid week.");
    }

    const data = await listProjectReports({
      year: year ?? undefined,
      weekNumber: weekNumber ?? undefined,
      q,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/report/projects failed", error);
    return jsonError("Failed to load project reports.", 500);
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.reportProjectCreate);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await request.json();
    const parsed = parseProjectPayload(body);
    if (!parsed.ok) return jsonError(parsed.error);

    const id = await createProjectReport(parsed.data);
    const data = await getProjectReportById(id);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/report/projects failed", error);
    return jsonError("Failed to create project report.", 500);
  }
}
