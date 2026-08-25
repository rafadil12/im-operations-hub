import { eachDate, toDateInput, type DateRange } from "@/lib/dateRange";
import {
  canonicalCategoryCode,
  groupByCanonicalCategory,
  isItemActive,
  preferredCanonicalCategoryRow,
} from "@/lib/sparepart/categories";
import {
  momPct,
  type SparepartOverviewByCategory,
  type SparepartOverviewData,
  type SparepartOverviewTrendPoint,
} from "@/lib/sparepart/overview";
import type { OverviewQueryBundle } from "@/lib/sparepart/fetchOverviewQueries";
import { eachMonthKeys, eachWeekKeys, n } from "@/lib/sparepart/overviewRange";

export function buildOverviewData(args: {
  bundle: OverviewQueryBundle;
  period: DateRange;
  categoryFilter: string | null;
  barGrain: "day" | "week" | "month";
  trendGrain: "day" | "month";
  sparkDates: string[];
}): SparepartOverviewData {
  const { bundle, period, categoryFilter, barGrain, trendGrain, sparkDates } = args;
  const {
    categories,
    catStats,
    catMoves,
    itemSummary,
    reconstructRows,
    monthMove,
    prevMove,
    inMonth,
    outMonth,
    txMonth,
    periodRows,
    typeRows,
    trendRows,
    sparkRows,
    locRows,
    heatRows,
    topRows,
    lowRows,
    usedRows,
    heatDayRows,
    activeLocs,
    sparseRows,
  } = bundle;

  const totalItems = n(itemSummary?.total_items);
  const totalStock = n(itemSummary?.total_stock);
  const lowStockCount = n(itemSummary?.low_stock);

  let prevLow = 0;
  let prevStockSum = 0;
  for (const row of reconstructRows) {
    const prevStock = n(row.stock_current) - n(row.month_delta);
    prevStockSum += prevStock;
    if (isItemActive(row.is_active) && n(row.min_stock) > 0 && prevStock <= n(row.min_stock)) {
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
    ])
  );
  const trendKeys = trendGrain === "day" ? eachDate(period) : eachMonthKeys(period);

  const typeMap = new Map(typeRows.map((row) => [row.code, n(row.qty)]));

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

  const sparkMap = new Map(sparkRows.map((row) => [String(row.day_key), n(row.qty)]));
  const heatDayMap = new Map(heatDayRows.map((row) => [String(row.day_key), n(row.qty)]));

  const filteredByCategory = categoryFilter
    ? byCategory.filter((row) => canonicalCategoryCode(row.code) === categoryFilter)
    : byCategory;

  const sparseSource = categoryFilter ? sparseRows : [];
  const sparseItems = sparseSource.length > 0 && sparseSource.length <= 2 ? sparseSource : [];

  return {
    range: {
      start: toDateInput(period.start),
      end: toDateInput(period.end),
    },
    category: categoryFilter,
    categories: [...groupByCanonicalCategory(categories).entries()].map(([code, group]) => {
      const preferred = preferredCanonicalCategoryRow(code, group);
      const stats = catStats.filter((s) => canonicalCategoryCode(s.code) === code);
      return {
        id: preferred.id,
        code,
        name_en: preferred.name_en,
        name_cn: preferred.name_cn,
        itemCount: stats.reduce((sum, row) => sum + n(row.item_count), 0),
        stockQty: stats.reduce((sum, row) => sum + n(row.stock_qty), 0),
      };
    }),
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
      barGrain,
      monthly: barKeys.map((monthKey) => ({
        month: monthKey,
        inQty: monthlyMap.get(monthKey)?.inQty ?? 0,
        outQty: monthlyMap.get(monthKey)?.outQty ?? 0,
      })),
    },
    movementByType: (["in", "out", "transfer", "reversal"] as const).map((type) => ({
      type,
      qty: typeMap.get(type) ?? 0,
    })),
    topUsedItems: usedRows.map((row) => ({
      code: row.code,
      name_en: row.name_en,
      name_cn: row.name_cn,
      category_code: canonicalCategoryCode(row.category_code),
      category_name_en: row.category_name_en,
      category_name_cn: row.category_name_cn,
      uom_code: row.uom_code,
      qty: n(row.qty),
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
        name: row.name_en,
        name_en: row.name_en,
        name_cn: row.name_cn,
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
            locationName: row.location_name_en,
            locationNameEn: row.location_name_en,
            locationNameCn: row.location_name_cn,
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
      category_name_en: row.category_name_en,
      category_name_cn: row.category_name_cn,
      uom_code: row.uom_code,
      stock_current: n(row.stock_current),
    })),
    lowStockItems: lowRows.map((row) => ({
      code: row.code,
      name_en: row.name_en,
      name_cn: row.name_cn,
      category_code: canonicalCategoryCode(row.category_code),
      category_name_en: row.category_name_en,
      category_name_cn: row.category_name_cn,
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
      category_name_en: row.category_name_en,
      category_name_cn: row.category_name_cn,
      uom_code: row.uom_code,
      stock_current: n(row.stock_current),
      min_stock: n(row.min_stock),
    })),
  };
}
