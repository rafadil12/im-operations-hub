import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { eachDate, inclusiveDayCount, previousPeriod, toDateInput } from "@/lib/dateRange";
import { categoryMatchSql, normalizeCategoryCode } from "@/lib/sparepart/categories";
import { buildOverviewData } from "@/lib/sparepart/buildOverviewData";
import { fetchOverviewQueryBundle } from "@/lib/sparepart/fetchOverviewQueries";
import { resolveOverviewRange } from "@/lib/sparepart/overviewRange";
import { buildOverviewSql } from "@/lib/sparepart/overviewSql";

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartOverviewView);
  if (gate instanceof NextResponse) return gate;

  try {
    const rawCategory = request.nextUrl.searchParams.get("category")?.trim() ?? "";
    const categoryFilter = rawCategory ? normalizeCategoryCode(rawCategory) : null;
    const catMatch = categoryFilter ? categoryMatchSql("c.code", categoryFilter) : null;

    const period = resolveOverviewRange(
      request.nextUrl.searchParams.get("start"),
      request.nextUrl.searchParams.get("end")
    );
    const prev = previousPeriod(period);
    const dayCount = inclusiveDayCount(period);
    const barGrain: "day" | "week" | "month" =
      dayCount <= 14 ? "day" : dayCount <= 45 ? "week" : "month";
    const trendGrain: "day" | "month" = dayCount <= 45 ? "day" : "month";
    const barGroupSql =
      barGrain === "day"
        ? "DATE_FORMAT(d.posting_date, '%Y-%m-%d')"
        : barGrain === "week"
          ? "DATE_FORMAT(DATE_SUB(DATE(d.posting_date), INTERVAL WEEKDAY(d.posting_date) DAY), '%Y-%m-%d')"
          : "DATE_FORMAT(d.posting_date, '%Y-%m')";
    const trendGroupSql =
      trendGrain === "day"
        ? "DATE_FORMAT(d.posting_date, '%Y-%m-%d')"
        : "DATE_FORMAT(d.posting_date, '%Y-%m')";
    const sparkDates = eachDate(period).slice(-14);
    const sparkFrom = `${sparkDates[0] ?? toDateInput(period.start)} 00:00:00`;

    const sql = buildOverviewSql(catMatch);
    const bundle = await fetchOverviewQueryBundle({
      sql,
      period,
      prev,
      barGroupSql,
      trendGroupSql,
      sparkFrom,
    });

    const result = buildOverviewData({
      bundle,
      period,
      categoryFilter,
      barGrain,
      trendGrain,
      sparkDates,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /sparepart/overview failed", error);
    return NextResponse.json({ error: "Failed to load sparepart overview." }, { status: 500 });
  }
}
