import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import {
  eachDate,
  formatDateOnly,
  getCurrentMonth,
  inclusiveDayCount,
  previousPeriod,
  resolveRange,
  toDateInput,
  type DateRange,
} from "@/lib/dateRange";
import {
  canonicalCategoryCode,
  categoryMatchSql,
  groupByCanonicalCategory,
  isItemActive,
  LOW_STOCK_SQL,
  normalizeCategoryCode,
  preferredCanonicalCategoryRow,
} from "@/lib/sparepartCategories";
import {
  IN_QTY_SQL,
  momPct,
  MOVEMENT_VOLUME_SQL,
  OUT_QTY_SQL,
  STOCK_DELTA_SQL,
  type SparepartOverviewByCategory,
  type SparepartOverviewData,
  type SparepartOverviewTrendPoint,
} from "@/lib/sparepartOverview";
import type { SparepartCategory } from "@/lib/types";

type CountRow = { qty: number; docs: number };
type NamedQty = { code: string; qty: number };
type PeriodRow = { period_key: string; in_qty: number; out_qty: number };
type DayCatRow = { day_key: string; category_code: string; qty: number };
type DayRow = { day_key: string; qty: number };
type LocRow = {
  location_id: number;
  code: string;
  name: string;
  qty: number;
};
type HeatRow = {
  category_code: string;
  location_id: number;
  location_name: string;
  qty: number;
};
type ItemRow = {
  code: string;
  name_en: string | null;
  name_cn: string | null;
  category_code: string;
  uom_code: string | null;
  stock_current: number;
  min_stock: number;
};
type ReconstructRow = {
  stock_current: number;
  min_stock: number;
  is_active: number | boolean;
  month_delta: number;
};
type CatStatRow = {
  code: string;
  name_en: string;
  name_cn: string;
  item_count: number;
  stock_qty: number;
  low_count: number;
};
type CatMoveRow = {
  code: string;
  movement_qty: number;
  net_qty: number;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function eachMonthKeys(range: DateRange): string[] {
  const [ys, ms] = range.start.slice(0, 7).split("-").map(Number);
  const [ye, me] = range.end.slice(0, 7).split("-").map(Number);
  const out: string[] = [];
  let y = ys;
  let m = ms;
  while (y < ye || (y === ye && m <= me)) {
    out.push(`${y}-${pad(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function eachWeekKeys(range: DateRange): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const iso of eachDate(range)) {
    const d = new Date(`${iso}T00:00:00`);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = formatDateOnly(monday);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

function resolveOverviewRange(startInput?: string | null, endInput?: string | null): DateRange {
  const startOk = Boolean(startInput && /^\d{4}-\d{2}-\d{2}/.test(startInput));
  const endOk = Boolean(endInput && /^\d{4}-\d{2}-\d{2}/.test(endInput));
  if (!startOk || !endOk) return getCurrentMonth();
  let period = resolveRange(startInput, endInput);
  if (toDateInput(period.start) > toDateInput(period.end)) {
    period = resolveRange(toDateInput(period.end), toDateInput(period.start));
  }
  return period;
}

function n(value: unknown): number {
  return Number(value ?? 0);
}

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartStockView);
  if (gate instanceof NextResponse) return gate;

  try {
    const rawCategory = request.nextUrl.searchParams.get("category")?.trim() ?? "";
    const categoryFilter = rawCategory
      ? normalizeCategoryCode(rawCategory)
      : null;
    const catMatch = categoryFilter
      ? categoryMatchSql("c.code", categoryFilter)
      : null;
    const catSql = catMatch ? `AND ${catMatch.sql}` : "";
    const catParams = catMatch?.params ?? [];

    const period = resolveOverviewRange(
      request.nextUrl.searchParams.get("start"),
      request.nextUrl.searchParams.get("end"),
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

    const itemCatJoin = `
      FROM sparepart_items i
      JOIN sparepart_categories c ON c.id = i.category_id
      JOIN uoms u ON u.id = i.uom_id
    `;
    const itemWhere = [
      "i.deleted_at IS NULL",
      catMatch ? catMatch.sql : null,
    ]
      .filter(Boolean)
      .join(" AND ");
    const itemParams = catParams;

    const moveJoin = `
      FROM sparepart_mat_docs d
      JOIN sparepart_mat_doc_items li ON li.doc_id = d.id
      JOIN sparepart_items i ON i.id = li.item_id
      JOIN sparepart_categories c ON c.id = i.category_id
    `;
    const moveWhere = [
      "i.deleted_at IS NULL",
      "d.posting_date >= ?",
      "d.posting_date <= ?",
      catMatch ? catMatch.sql : null,
    ]
      .filter(Boolean)
      .join(" AND ");

    const moveParams = (start: string, end: string) =>
      catMatch ? [start, end, ...catParams] : [start, end];

    const [
      categories,
      catStats,
      catMoves,
      [itemSummary],
      reconstructRows,
      [monthMove],
      [prevMove],
      [inMonth],
      [outMonth],
      [txMonth],
      periodRows,
      typeRows,
      trendRows,
      sparkRows,
      locRows,
      heatRows,
      topRows,
      lowRows,
      heatDayRows,
      [activeLocs],
      sparseRows,
    ] = await Promise.all([
      query<SparepartCategory[]>(
        `SELECT id, code, name_en, name_cn, sort_order, is_active
         FROM sparepart_categories
         WHERE is_active = 1
         ORDER BY sort_order ASC, code ASC`,
      ),
      query<CatStatRow[]>(
        `SELECT
           c.code, c.name_en, c.name_cn,
           COUNT(i.id) AS item_count,
           COALESCE(SUM(i.stock_current), 0) AS stock_qty,
           SUM(CASE WHEN ${LOW_STOCK_SQL} THEN 1 ELSE 0 END) AS low_count
         FROM sparepart_categories c
         LEFT JOIN sparepart_items i
           ON i.category_id = c.id AND i.deleted_at IS NULL
         WHERE c.is_active = 1
           ${catSql}
         GROUP BY c.id, c.code, c.name_en, c.name_cn, c.sort_order
         ORDER BY c.sort_order ASC`,
        catParams,
      ),
      query<CatMoveRow[]>(
        `SELECT
           c.code,
           COALESCE(SUM(${MOVEMENT_VOLUME_SQL}), 0) AS movement_qty,
           COALESCE(SUM(${STOCK_DELTA_SQL}), 0) AS net_qty
         ${moveJoin}
         WHERE i.deleted_at IS NULL
           AND d.posting_date >= ? AND d.posting_date <= ?
           ${catSql}
         GROUP BY c.code`,
        catMatch
          ? [period.start, period.end, ...catParams]
          : [period.start, period.end],
      ),
      query<{ total_items: number; total_stock: number; low_stock: number }[]>(
        `SELECT
           COUNT(*) AS total_items,
           COALESCE(SUM(i.stock_current), 0) AS total_stock,
           SUM(CASE WHEN ${LOW_STOCK_SQL} THEN 1 ELSE 0 END) AS low_stock
         ${itemCatJoin}
         WHERE ${itemWhere}`,
        itemParams,
      ),
      query<ReconstructRow[]>(
        `SELECT
           i.stock_current,
           i.min_stock,
           i.is_active,
           COALESCE(SUM(${STOCK_DELTA_SQL}), 0) AS month_delta
         ${itemCatJoin}
         LEFT JOIN sparepart_mat_doc_items li ON li.item_id = i.id
         LEFT JOIN sparepart_mat_docs d
           ON d.id = li.doc_id
          AND d.posting_date >= ?
          AND d.posting_date <= ?
         WHERE ${itemWhere}
         GROUP BY i.id, i.stock_current, i.min_stock, i.is_active`,
        [period.start, period.end, ...itemParams],
      ),
      query<CountRow[]>(
        `SELECT
           COALESCE(SUM(${MOVEMENT_VOLUME_SQL}), 0) AS qty,
           COUNT(DISTINCT d.id) AS docs
         ${moveJoin}
         WHERE ${moveWhere}`,
        moveParams(period.start, period.end),
      ),
      query<CountRow[]>(
        `SELECT
           COALESCE(SUM(${MOVEMENT_VOLUME_SQL}), 0) AS qty,
           COUNT(DISTINCT d.id) AS docs
         ${moveJoin}
         WHERE ${moveWhere}`,
        moveParams(prev.start, prev.end),
      ),
      query<CountRow[]>(
        `SELECT
           COALESCE(SUM(${IN_QTY_SQL}), 0) AS qty,
           COUNT(DISTINCT CASE WHEN d.movement_type = '101' THEN d.id END) AS docs
         ${moveJoin}
         WHERE ${moveWhere}`,
        moveParams(period.start, period.end),
      ),
      query<CountRow[]>(
        `SELECT
           COALESCE(SUM(${OUT_QTY_SQL}), 0) AS qty,
           COUNT(DISTINCT CASE WHEN d.movement_type = '201' THEN d.id END) AS docs
         ${moveJoin}
         WHERE ${moveWhere}`,
        moveParams(period.start, period.end),
      ),
      query<CountRow[]>(
        `SELECT 0 AS qty, COUNT(DISTINCT d.id) AS docs
         ${moveJoin}
         WHERE ${moveWhere}`,
        moveParams(period.start, period.end),
      ),
      query<PeriodRow[]>(
        `SELECT
           ${barGroupSql} AS period_key,
           COALESCE(SUM(${IN_QTY_SQL}), 0) AS in_qty,
           COALESCE(SUM(${OUT_QTY_SQL}), 0) AS out_qty
         ${moveJoin}
         WHERE i.deleted_at IS NULL
           AND d.posting_date >= ?
           AND d.posting_date <= ?
           ${catSql}
         GROUP BY ${barGroupSql}
         ORDER BY period_key ASC`,
        catMatch
          ? [period.start, period.end, ...catParams]
          : [period.start, period.end],
      ),
      query<NamedQty[]>(
        `SELECT
           CASE
             WHEN d.movement_type = '101' THEN 'in'
             WHEN d.movement_type = '201' THEN 'out'
             WHEN d.movement_type = '311' THEN 'transfer'
             ELSE 'reversal'
           END AS code,
           COALESCE(SUM(li.qty), 0) AS qty
         ${moveJoin}
         WHERE ${moveWhere}
         GROUP BY
           CASE
             WHEN d.movement_type = '101' THEN 'in'
             WHEN d.movement_type = '201' THEN 'out'
             WHEN d.movement_type = '311' THEN 'transfer'
             ELSE 'reversal'
           END`,
        moveParams(period.start, period.end),
      ),
      query<DayCatRow[]>(
        `SELECT
           ${trendGroupSql} AS day_key,
           c.code AS category_code,
           COALESCE(SUM(${MOVEMENT_VOLUME_SQL}), 0) AS qty
         ${moveJoin}
         WHERE i.deleted_at IS NULL
           AND d.posting_date >= ? AND d.posting_date <= ?
           ${catSql}
         GROUP BY ${trendGroupSql}, c.code`,
        catMatch
          ? [period.start, period.end, ...catParams]
          : [period.start, period.end],
      ),
      query<DayRow[]>(
        `SELECT
           DATE_FORMAT(d.posting_date, '%Y-%m-%d') AS day_key,
           COALESCE(SUM(${MOVEMENT_VOLUME_SQL}), 0) AS qty
         ${moveJoin}
         WHERE i.deleted_at IS NULL
           AND d.posting_date >= ?
           AND d.posting_date <= ?
           ${catSql}
         GROUP BY DATE_FORMAT(d.posting_date, '%Y-%m-%d')`,
        catMatch
          ? [sparkFrom, period.end, ...catParams]
          : [sparkFrom, period.end],
      ),
      query<LocRow[]>(
        `SELECT
           loc.id AS location_id, loc.code, loc.name,
           COALESCE(SUM(b.qty), 0) AS qty
         FROM sparepart_storage_locations loc
         LEFT JOIN sparepart_stock_balances b ON b.storage_location_id = loc.id
         LEFT JOIN sparepart_items i ON i.id = b.item_id AND i.deleted_at IS NULL
         LEFT JOIN sparepart_categories c ON c.id = i.category_id
         WHERE loc.is_active = 1
           ${catMatch ? `AND (i.id IS NULL OR ${catMatch.sql})` : ""}
         GROUP BY loc.id, loc.code, loc.name
         ORDER BY qty DESC, loc.name ASC`,
        catParams,
      ),
      query<HeatRow[]>(
        `SELECT
           c.code AS category_code,
           loc.id AS location_id,
           loc.name AS location_name,
           COALESCE(SUM(b.qty), 0) AS qty
         FROM sparepart_categories c
         CROSS JOIN sparepart_storage_locations loc
         LEFT JOIN sparepart_items i
           ON i.category_id = c.id AND i.deleted_at IS NULL
         LEFT JOIN sparepart_stock_balances b
           ON b.item_id = i.id AND b.storage_location_id = loc.id
         WHERE c.is_active = 1 AND loc.is_active = 1
           ${catSql}
         GROUP BY c.code, loc.id, loc.name, c.sort_order
         ORDER BY c.sort_order ASC, loc.name ASC`,
        catParams,
      ),
      query<ItemRow[]>(
        `SELECT i.code, i.name_en, i.name_cn, c.code AS category_code,
                u.code AS uom_code, i.stock_current, i.min_stock
         ${itemCatJoin}
         WHERE ${itemWhere}
         ORDER BY i.stock_current DESC, i.code ASC
         LIMIT 5`,
        itemParams,
      ),
      query<ItemRow[]>(
        `SELECT i.code, i.name_en, i.name_cn, c.code AS category_code,
                u.code AS uom_code, i.stock_current, i.min_stock
         ${itemCatJoin}
         WHERE ${itemWhere} AND ${LOW_STOCK_SQL}
         ORDER BY i.stock_current ASC, i.code ASC
         LIMIT 20`,
        itemParams,
      ),
      query<DayRow[]>(
        `SELECT
           DATE_FORMAT(d.posting_date, '%Y-%m-%d') AS day_key,
           COALESCE(SUM(${MOVEMENT_VOLUME_SQL}), 0) AS qty
         ${moveJoin}
         WHERE ${moveWhere}
         GROUP BY DATE_FORMAT(d.posting_date, '%Y-%m-%d')`,
        moveParams(period.start, period.end),
      ),
      query<{ qty: number }[]>(
        catMatch
          ? `SELECT COUNT(DISTINCT loc.id) AS qty
             FROM sparepart_storage_locations loc
             JOIN sparepart_stock_balances b ON b.storage_location_id = loc.id
             JOIN sparepart_items i ON i.id = b.item_id
             JOIN sparepart_categories c ON c.id = i.category_id
             WHERE loc.is_active = 1 AND i.deleted_at IS NULL
               AND b.qty > 0 AND ${catMatch.sql}`
          : `SELECT COUNT(*) AS qty
             FROM sparepart_storage_locations
             WHERE is_active = 1`,
        catParams,
      ),
      query<ItemRow[]>(
        `SELECT i.code, i.name_en, i.name_cn, c.code AS category_code,
                u.code AS uom_code, i.stock_current, i.min_stock
         ${itemCatJoin}
         WHERE ${itemWhere}
         ORDER BY i.code ASC
         LIMIT 3`,
        itemParams,
      ),
    ]);

    const totalItems = n(itemSummary?.total_items);
    const totalStock = n(itemSummary?.total_stock);
    const lowStockCount = n(itemSummary?.low_stock);

    let prevLow = 0;
    let prevStockSum = 0;
    for (const row of reconstructRows) {
      const prevStock = n(row.stock_current) - n(row.month_delta);
      prevStockSum += prevStock;
      if (
        isItemActive(row.is_active) &&
        n(row.min_stock) > 0 &&
        prevStock <= n(row.min_stock)
      ) {
        prevLow += 1;
      }
    }

    const movementQty = n(monthMove?.qty);
    const prevMovementQty = n(prevMove?.qty);

    const moveByCat = new Map<string, { movement: number; net: number }>();
    for (const row of catMoves) {
      const code = canonicalCategoryCode(row.code);
      const prev = moveByCat.get(code);
      moveByCat.set(code, {
        movement: (prev?.movement ?? 0) + n(row.movement_qty),
        net: (prev?.net ?? 0) + n(row.net_qty),
      });
    }

    const byCategory: SparepartOverviewByCategory[] = [
      ...groupByCanonicalCategory(catStats).entries(),
    ].map(([code, group]) => {
      const preferred = preferredCanonicalCategoryRow(code, group);
      const move = moveByCat.get(code);
      return {
        code,
        name_en: preferred.name_en,
        name_cn: preferred.name_cn,
        totalItems: group.reduce((sum, row) => sum + n(row.item_count), 0),
        currentStock: group.reduce((sum, row) => sum + n(row.stock_qty), 0),
        lowStock: group.reduce((sum, row) => sum + n(row.low_count), 0),
        movementQty: move?.movement ?? 0,
        netMovement: move?.net ?? 0,
      };
    });

    const barKeys =
      barGrain === "day"
        ? eachDate(period)
        : barGrain === "week"
          ? eachWeekKeys(period)
          : eachMonthKeys(period);
    const monthlyMap = new Map(
      periodRows.map((row) => [
        String(row.period_key),
        { inQty: n(row.in_qty), outQty: n(row.out_qty) },
      ]),
    );
    const trendKeys =
      trendGrain === "day" ? eachDate(period) : eachMonthKeys(period);

    const typeMap = new Map(
      typeRows.map((row) => [row.code, n(row.qty)]),
    );

    const dayCatMap = new Map<string, number>();
    for (const row of trendRows) {
      const code = canonicalCategoryCode(row.category_code);
      const key = `${row.day_key}|${code}`;
      dayCatMap.set(key, (dayCatMap.get(key) ?? 0) + n(row.qty));
    }
    const trendDaily: SparepartOverviewTrendPoint[] = trendKeys.map((date) => ({
      date,
      IT: dayCatMap.get(`${date}|IT`) ?? 0,
      AGV: dayCatMap.get(`${date}|AGV`) ?? 0,
      ASSEMBLY: dayCatMap.get(`${date}|ASSEMBLY`) ?? 0,
      MES: dayCatMap.get(`${date}|MES`) ?? 0,
    }));

    const sparkMap = new Map(
      sparkRows.map((row) => [String(row.day_key), n(row.qty)]),
    );
    const heatDayMap = new Map(
      heatDayRows.map((row) => [String(row.day_key), n(row.qty)]),
    );

    const filteredByCategory = categoryFilter
      ? byCategory.filter(
          (row) => canonicalCategoryCode(row.code) === categoryFilter,
        )
      : byCategory;

    const sparseSource = categoryFilter ? sparseRows : [];
    const sparseItems =
      sparseSource.length > 0 && sparseSource.length <= 2 ? sparseSource : [];

    const result: SparepartOverviewData = {
      range: {
        start: toDateInput(period.start),
        end: toDateInput(period.end),
      },
      category: categoryFilter,
      categories: [...groupByCanonicalCategory(categories).entries()].map(
        ([code, group]) => {
          const preferred = preferredCanonicalCategoryRow(code, group);
          const stats = catStats.filter(
            (s) => canonicalCategoryCode(s.code) === code,
          );
          return {
            id: preferred.id,
            code,
            name_en: preferred.name_en,
            name_cn: preferred.name_cn,
            itemCount: stats.reduce((sum, row) => sum + n(row.item_count), 0),
            stockQty: stats.reduce((sum, row) => sum + n(row.stock_qty), 0),
          };
        },
      ),
      kpi: {
        totalItems,
        totalStock,
        totalStockMomPct: momPct(totalStock, prevStockSum),
        lowStockCount,
        lowStockMomPct: momPct(lowStockCount, prevLow),
        movementQty,
        movementMomPct: momPct(movementQty, prevMovementQty),
        activeLocations: n(activeLocs?.qty),
        sparkline: sparkDates.map((date) => ({
          date,
          qty: sparkMap.get(date) ?? 0,
        })),
      },
      byCategory: filteredByCategory,
      movementSummary: {
        inQty: n(inMonth?.qty),
        inDocs: n(inMonth?.docs),
        outQty: n(outMonth?.qty),
        outDocs: n(outMonth?.docs),
        netQty: n(inMonth?.qty) - n(outMonth?.qty),
        transactionCount: n(txMonth?.docs),
        monthly: barKeys.map((monthKey) => ({
          month: monthKey,
          inQty: monthlyMap.get(monthKey)?.inQty ?? 0,
          outQty: monthlyMap.get(monthKey)?.outQty ?? 0,
        })),
      },
      movementByType: (
        ["in", "out", "transfer", "reversal"] as const
      ).map((type) => ({
        type,
        qty: typeMap.get(type) ?? 0,
      })),
      trendDaily: categoryFilter
        ? trendDaily.map((point) => ({
            date: point.date,
            IT: categoryFilter === "IT" ? point.IT : 0,
            AGV: categoryFilter === "AGV" ? point.AGV : 0,
            ASSEMBLY: categoryFilter === "ASSEMBLY" ? point.ASSEMBLY : 0,
            MES: categoryFilter === "MES" ? point.MES : 0,
          }))
        : trendDaily,
      stockByLocation: locRows
        .map((row) => ({
          locationId: n(row.location_id),
          code: row.code,
          name: row.name,
          qty: n(row.qty),
        }))
        .filter((row) => row.qty > 0)
        .sort((a, b) => b.qty - a.qty),
      categoryLocationHeatmap: [
        ...heatRows
          .reduce((map, row) => {
            const categoryCode = canonicalCategoryCode(row.category_code);
            const locationId = n(row.location_id);
            const key = `${categoryCode}|${locationId}`;
            const prev = map.get(key);
            map.set(key, {
              categoryCode,
              locationId,
              locationName: row.location_name,
              qty: (prev?.qty ?? 0) + n(row.qty),
            });
            return map;
          }, new Map<string, SparepartOverviewData["categoryLocationHeatmap"][number]>())
          .values(),
      ],
      topStock: topRows.map((row) => ({
        code: row.code,
        name_en: row.name_en,
        name_cn: row.name_cn,
        category_code: canonicalCategoryCode(row.category_code),
        uom_code: row.uom_code,
        stock_current: n(row.stock_current),
      })),
      lowStockItems: lowRows.map((row) => ({
        code: row.code,
        name_en: row.name_en,
        name_cn: row.name_cn,
        category_code: canonicalCategoryCode(row.category_code),
        uom_code: row.uom_code,
        stock_current: n(row.stock_current),
        min_stock: n(row.min_stock),
        status: n(row.stock_current) <= 0 ? "critical" : "low",
      })),
      movementHeatmap: eachDate(period).map((date) => ({
        date,
        qty: heatDayMap.get(date) ?? 0,
      })),
      sparseItems: sparseItems.map((row) => ({
        code: row.code,
        name_en: row.name_en,
        name_cn: row.name_cn,
        category_code: canonicalCategoryCode(row.category_code),
        uom_code: row.uom_code,
        stock_current: n(row.stock_current),
        min_stock: n(row.min_stock),
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /sparepart/overview failed", error);
    return NextResponse.json(
      { error: "Failed to load sparepart overview." },
      { status: 500 },
    );
  }
}
