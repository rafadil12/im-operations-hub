import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { jsonError, parsePositiveInt } from "@/lib/report/apiHelpers";
import {
  deleteProjectReport,
  getProjectReportById,
  updateProjectReport,
} from "@/lib/report/projectStore";
import { parseProjectPayload } from "@/lib/report/projectValidation";

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

    const ok = await updateProjectReport(id, parsed.data);
    if (!ok) return jsonError("Project report not found.", 404);

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

    const ok = await deleteProjectReport(id);
    if (!ok) return jsonError("Project report not found.", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/report/projects/[id] failed", error);
    return jsonError("Failed to delete project report.", 500);
  }
}
