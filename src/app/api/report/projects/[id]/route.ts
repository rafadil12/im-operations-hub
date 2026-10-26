import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { hasDetail } from "@/lib/logs-center/dailyRemark";
import {
  projectCreateChanges,
  projectDeleteChanges,
  projectUpdateChanges,
  recordReportProject,
  type ProjectRemarkLine,
  type ProjectRemarkSnapshot,
} from "@/lib/logs-center/reportRemark";
import { suppressLogsCenter } from "@/lib/logs-center/record";
import { jsonError, parsePositiveInt } from "@/lib/report/apiHelpers";
import {
  deleteProjectReport,
  getProjectReportById,
  updateProjectReport,
} from "@/lib/report/projectStore";
import { parseProjectPayload } from "@/lib/report/projectValidation";
import type { ReportProjectPayload, ReportProjectReport } from "@/lib/report/projectTypes";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
  const gate = await requirePermission(PERMISSIONS.reportProjectRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const id = parsePositiveInt((await context.params).id);
    if (!id) return jsonError("Invalid id.");

    const data = await getProjectReportById(id);
    if (!data) return jsonError("Project report not found.", 404);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/report/projects/[id] failed", error);
    return jsonError("Failed to load project report.", 500);
  }
}

export async function PUT(request: NextRequest, context: Ctx) {
  const gate = await requirePermission(PERMISSIONS.reportProjectUpdate);
  if (gate instanceof NextResponse) return gate;

  try {
    const id = parsePositiveInt((await context.params).id);
    if (!id) return jsonError("Invalid id.");

    const body = await request.json();
    const parsed = parseProjectPayload(body);
    if (!parsed.ok) return jsonError(parsed.error);

    const before = await getProjectReportById(id);
    if (!before) return jsonError("Project report not found.", 404);

    const changes = projectUpdateChanges(projectSnapshot(before), payloadSnapshot(parsed.data));
    if (!hasDetail(changes)) {
      return NextResponse.json({ success: true, data: before });
    }
    const ok = await suppressLogsCenter(() => updateProjectReport(id, parsed.data));
    if (!ok) return jsonError("Project report not found.", 404);
    await recordReportProject("update", changes);

    const data = await getProjectReportById(id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("PUT /api/report/projects/[id] failed", error);
    return jsonError("Failed to update project report.", 500);
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const gate = await requirePermission(PERMISSIONS.reportProjectDelete);
  if (gate instanceof NextResponse) return gate;

  try {
    const id = parsePositiveInt((await context.params).id);
    if (!id) return jsonError("Invalid id.");

    const before = await getProjectReportById(id);
    if (!before) return jsonError("Project report not found.", 404);

    const snapshot = projectSnapshot(before);
    const ok = await suppressLogsCenter(() => deleteProjectReport(id));
    if (!ok) return jsonError("Project report not found.", 404);
    await recordReportProject("delete", projectDeleteChanges(snapshot.header, snapshot.lines));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/report/projects/[id] failed", error);
    return jsonError("Failed to delete project report.", 500);
  }
}

function projectSnapshot(report: ReportProjectReport): ProjectRemarkSnapshot {
  return {
    header: {
      projectDepartment: report.projectDepartment,
      reporterName: report.reporterName,
      reportDate: report.reportDate,
      cycleLabel: report.cycleLabel,
      year: report.year,
      weekNumber: report.weekNumber,
      status: report.status,
    },
    lines: report.lines.map(projectLine),
  };
}

function payloadSnapshot(payload: ReportProjectPayload): ProjectRemarkSnapshot {
  return {
    header: {
      projectDepartment: payload.projectDepartment,
      reporterName: payload.reporterName,
      reportDate: payload.reportDate,
      cycleLabel: payload.cycleLabel,
      year: payload.year,
      weekNumber: payload.weekNumber,
      status: payload.status,
    },
    lines: payload.lines.map(projectLine),
  };
}

function projectLine(line: ProjectRemarkLine): ProjectRemarkLine {
  return {
    target: line.target,
    mainTask: line.mainTask,
    currentPriority: line.currentPriority,
    planStart: line.planStart,
    planEnd: line.planEnd,
    health: line.health,
    lineStatus: line.lineStatus,
    progressRatio: line.progressRatio,
    pic: line.pic,
    thisWeekProgress: line.thisWeekProgress,
    nextWeekPlan: line.nextWeekPlan,
  };
}
