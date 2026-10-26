import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { hasTextPair, jsonError, parsePositiveInt } from "@/lib/report/apiHelpers";
import { deleteReportLine, getReportLineById, updateReportLine } from "@/lib/report/lineStore";
import { parseCompletionRate } from "@/lib/report/weekCalendar";
import {
  loadSubItemNames,
  loadWeekArea,
  recordReportWeek,
  removedLineDetail,
  weekLineEditDetail,
} from "@/lib/logs-center/reportRemark";
import { suppressLogsCenter } from "@/lib/logs-center/record";

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

    const nextSubItemId = subItemId !== undefined ? subItemId : existing.subItemId;
    let nextSubItemNameEn = existing.subItemNameEn;
    let nextSubItemNameCn = existing.subItemNameCn;
    if (nextSubItemId !== existing.subItemId && nextSubItemId) {
      const names = await loadSubItemNames(nextSubItemId);
      nextSubItemNameEn = names?.name_en ?? null;
      nextSubItemNameCn = names?.name_cn ?? null;
    }
    const next = {
      subItemId: nextSubItemId,
      subItemNameEn: nextSubItemNameEn,
      subItemNameCn: nextSubItemNameCn,
      workTargetEn:
        workTargetEn !== undefined
          ? workTargetEn || workTargetCn || existing.workTargetCn
          : existing.workTargetEn,
      workTargetCn:
        workTargetCn !== undefined
          ? workTargetCn || workTargetEn || existing.workTargetEn
          : existing.workTargetCn,
      weeklyCompletionRate:
        body.weeklyCompletionRate !== undefined
          ? parseCompletionRate(body.weeklyCompletionRate)
          : existing.weeklyCompletionRate,
      summaryEn:
        summaryEn !== undefined ? summaryEn || summaryCn || existing.summaryCn : existing.summaryEn,
      summaryCn:
        summaryCn !== undefined ? summaryCn || summaryEn || existing.summaryEn : existing.summaryCn,
      planEn: body.planEn !== undefined ? String(body.planEn).trim() || null : existing.planEn,
      planCn: body.planCn !== undefined ? String(body.planCn).trim() || null : existing.planCn,
    };
    const detail = weekLineEditDetail(existing, next);
    const sortChanged =
      body.sortOrder !== undefined && Number(body.sortOrder) !== existing.sortOrder;
    const change = sortChanged
      ? {
          field: "lines",
          to: detail?.to ? `${detail.to}, sort order updated` : "sort order updated",
          toCn: detail?.toCn ? `${detail.toCn}，排序已更新` : "排序已更新",
        }
      : detail;
    if (!change) return NextResponse.json({ success: true });

    await suppressLogsCenter(() =>
      updateReportLine(id, {
        subItemId: next.subItemId,
        workTargetEn: next.workTargetEn,
        workTargetCn: next.workTargetCn,
        weeklyCompletionRate: next.weeklyCompletionRate,
        summaryEn: next.summaryEn,
        summaryCn: next.summaryCn,
        planEn: next.planEn,
        planCn: next.planCn,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
      })
    );
    const place = await loadWeekArea(existing.weekId, existing.areaId);
    if (place) {
      await recordReportWeek({
        action: "update",
        weekNumber: place.weekNumber,
        area: place.area,
        detail: change,
      });
    }

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

    const place = await loadWeekArea(existing.weekId, existing.areaId);
    await suppressLogsCenter(() => deleteReportLine(id));
    if (place) {
      await recordReportWeek({
        action: "delete",
        weekNumber: place.weekNumber,
        area: place.area,
        detail: removedLineDetail(existing.subItemNameEn, existing.subItemNameCn),
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/report/lines/[id] ERROR:", error);
    return jsonError("Failed to delete report line.", 500);
  }
}
