import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { projectCreateChanges, recordReportProject } from "@/lib/logs-center/reportRemark";
import { suppressLogsCenter } from "@/lib/logs-center/record";
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

    const id = await suppressLogsCenter(() => createProjectReport(parsed.data));
    await recordReportProject(
      "create",
      projectCreateChanges(
        {
          projectDepartment: parsed.data.projectDepartment,
          reporterName: parsed.data.reporterName,
          reportDate: parsed.data.reportDate,
          cycleLabel: parsed.data.cycleLabel,
          year: parsed.data.year,
          weekNumber: parsed.data.weekNumber,
          status: parsed.data.status,
        },
        parsed.data.lines
      )
    );
    const data = await getProjectReportById(id);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/report/projects failed", error);
    return jsonError("Failed to create project report.", 500);
  }
}
