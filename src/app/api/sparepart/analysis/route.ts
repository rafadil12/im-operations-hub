import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { getCurrentMonth } from "@/lib/dateRange";
import { query } from "@/lib/db";
import type { SparepartAnalysisResult } from "@/lib/types";

type SummaryRow = {
  total_items: number;
  zero_stock: number;
};

type UsageRow = {
  qty: number;
};

type MostUsedRow = {
  code: string;
  name_en: string | null;
  name_cn: string | null;
  qty: number;
};

type TrendRow = {
  month_key: string;
  qty: number;
};

const USAGE_SQL = `
  COALESCE(SUM(CASE
    WHEN d.movement_type = '201' THEN li.qty
    WHEN d.movement_type = '202' THEN -li.qty
    ELSE 0 END), 0)
`;

function yearRange(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01 00:00:00`,
    end: `${year}-12-31 23:59:59`,
  };
}

function allMonths(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return `${year}-${m}`;
  });
}

export async function GET(_request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartStockView);
  if (gate instanceof NextResponse) return gate;

  try {
    const year = 2026;
    const previousYear = year - 1;
    const { start: yearStart, end: yearEnd } = yearRange(year);
    const { start: prevYearStart, end: prevYearEnd } = yearRange(previousYear);
    const month = getCurrentMonth();
    const yearParams = [yearStart, yearEnd];
    const prevYearParams = [prevYearStart, prevYearEnd];
    const monthParams = [month.start, month.end];

    const dateFilter = `
      d.posting_date >= ?
      AND d.posting_date <= ?
    `;

    const trendSql = `
      SELECT
         DATE_FORMAT(d.posting_date, '%Y-%m') AS month_key,
         ${USAGE_SQL} AS qty
       FROM sparepart_mat_docs d
       JOIN sparepart_mat_doc_items li ON li.doc_id = d.id
       WHERE ${dateFilter}
         AND d.movement_type IN ('201', '202')
       GROUP BY DATE_FORMAT(d.posting_date, '%Y-%m')
       ORDER BY month_key ASC
    `;

    const [
      [summary],
      [monthUsage],
      [yearUsage],
      mostUsed,
      trendRows,
      prevTrendRows,
    ] = await Promise.all([
      query<SummaryRow[]>(
        `SELECT
           COUNT(*) AS total_items,
           SUM(CASE WHEN stock_current <= 0 THEN 1 ELSE 0 END) AS zero_stock
         FROM sparepart_items
         WHERE deleted_at IS NULL`,
      ),
      query<UsageRow[]>(
        `SELECT ${USAGE_SQL} AS qty
         FROM sparepart_mat_docs d
         JOIN sparepart_mat_doc_items li ON li.doc_id = d.id
         WHERE ${dateFilter}
           AND d.movement_type IN ('201', '202')`,
        monthParams,
      ),
      query<UsageRow[]>(
        `SELECT ${USAGE_SQL} AS qty
         FROM sparepart_mat_docs d
         JOIN sparepart_mat_doc_items li ON li.doc_id = d.id
         WHERE ${dateFilter}
           AND d.movement_type IN ('201', '202')`,
        yearParams,
      ),
      query<MostUsedRow[]>(
        `SELECT
           i.code,
           i.name_en,
           i.name_cn,
           ${USAGE_SQL} AS qty
         FROM sparepart_mat_doc_items li
         JOIN sparepart_mat_docs d ON d.id = li.doc_id
         JOIN sparepart_items i ON i.id = li.item_id
         WHERE ${dateFilter}
           AND d.movement_type IN ('201', '202')
           AND i.deleted_at IS NULL
         GROUP BY i.id, i.code, i.name_en, i.name_cn
         HAVING qty > 0
         ORDER BY qty DESC
         LIMIT 3`,
        monthParams,
      ),
      query<TrendRow[]>(trendSql, yearParams),
      query<TrendRow[]>(trendSql, prevYearParams),
    ]);

    const byMonth = (rows: TrendRow[]) =>
      new Map(
        rows.map((row) => [
          String(row.month_key).slice(5, 7),
          Number(row.qty ?? 0),
        ]),
      );

    const currentByMonth = byMonth(trendRows);
    const previousByMonth = byMonth(prevTrendRows);

    const result: SparepartAnalysisResult = {
      totalItems: Number(summary?.total_items ?? 0),
      zeroStock: Number(summary?.zero_stock ?? 0),
      usageThisMonth: Number(monthUsage?.qty ?? 0),
      usageThisYear: Number(yearUsage?.qty ?? 0),
      mostUsed: mostUsed.map((row) => ({
        code: row.code,
        name_en: row.name_en?.trim() || row.code,
        name_cn: row.name_cn?.trim() || row.name_en?.trim() || row.code,
        qty: Number(row.qty ?? 0),
      })),
      usedTrend: allMonths(year).map((date) => {
        const monthKey = date.slice(5, 7);
        return {
          date,
          current: currentByMonth.get(monthKey) ?? 0,
          previous: previousByMonth.get(monthKey) ?? 0,
        };
      }),
    };

    return NextResponse.json({
      result,
      range: { start: yearStart, end: yearEnd },
    });
  } catch (error) {
    console.error("GET /sparepart/analysis failed", error);
    return NextResponse.json(
      { error: "Failed to load sparepart analysis." },
      { status: 500 },
    );
  }
}
