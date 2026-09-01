import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { hasTextPair, jsonError, parsePositiveInt } from "@/lib/report/apiHelpers";
import { deleteReportLine, getReportLineById, updateReportLine } from "@/lib/report/lineStore";
import { parseCompletionRate } from "@/lib/report/weekCalendar";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const gate = await requireAnyPermission([PERMISSIONS.reportLineUpdate]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id: idRaw } = await context.params;
    const id = parsePositiveInt(idRaw);
    if (!id) return jsonError("Invalid line id.");

    const existing = await getReportLineById(id);
    if (!existing) return jsonError("Report line not found.", 404);

    const body = await request.json();
    const workTargetEn =
      body.workTargetEn !== undefined ? String(body.workTargetEn).trim() : undefined;
    const workTargetCn =
      body.workTargetCn !== undefined ? String(body.workTargetCn).trim() : undefined;
    const summaryEn = body.summaryEn !== undefined ? String(body.summaryEn).trim() : undefined;
    const summaryCn = body.summaryCn !== undefined ? String(body.summaryCn).trim() : undefined;

    if (
      workTargetEn !== undefined &&
      workTargetCn !== undefined &&
      !hasTextPair(workTargetEn, workTargetCn)
    ) {
      return jsonError("Target (EN or CN) is required.");
    }
    if (
      summaryEn !== undefined &&
      summaryCn !== undefined &&
      !hasTextPair(summaryEn, summaryCn)
    ) {
      return jsonError("Summary (EN or CN) is required.");
    }

    const subItemId =
      body.subItemId !== undefined
        ? body.subItemId != null && body.subItemId !== ""
          ? parsePositiveInt(String(body.subItemId))
          : null
        : undefined;

    await updateReportLine(id, {
      subItemId,
      workTargetEn:
        workTargetEn !== undefined ? workTargetEn || workTargetCn || existing.workTargetCn : undefined,
      workTargetCn:
        workTargetCn !== undefined ? workTargetCn || workTargetEn || existing.workTargetEn : undefined,
      weeklyCompletionRate:
        body.weeklyCompletionRate !== undefined
          ? parseCompletionRate(body.weeklyCompletionRate)
          : undefined,
      summaryEn:
        summaryEn !== undefined ? summaryEn || summaryCn || existing.summaryCn : undefined,
      summaryCn:
        summaryCn !== undefined ? summaryCn || summaryEn || existing.summaryEn : undefined,
      planEn:
        body.planEn !== undefined ? String(body.planEn).trim() || null : undefined,
      planCn:
        body.planCn !== undefined ? String(body.planCn).trim() || null : undefined,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/report/lines/[id] ERROR:", error);
    return jsonError("Failed to update report line.", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const gate = await requireAnyPermission([PERMISSIONS.reportLineDelete]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id: idRaw } = await context.params;
    const id = parsePositiveInt(idRaw);
    if (!id) return jsonError("Invalid line id.");

    const existing = await getReportLineById(id);
    if (!existing) return jsonError("Report line not found.", 404);

    await deleteReportLine(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/report/lines/[id] ERROR:", error);
    return jsonError("Failed to delete report line.", 500);
  }
}
