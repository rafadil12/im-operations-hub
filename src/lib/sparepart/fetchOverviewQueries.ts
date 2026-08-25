import { query } from "@/lib/db";
import type { DateRange } from "@/lib/dateRange";
import { LOW_STOCK_SQL } from "@/lib/sparepart/categories";
import {
  IN_QTY_SQL,
  MOVEMENT_VOLUME_SQL,
  OUT_QTY_SQL,
  STOCK_DELTA_SQL,
} from "@/lib/sparepart/overview";
import type { SparepartCategory } from "@/lib/types";
import type {
  CatMoveRow,
  CatStatRow,
  CountRow,
  DayCatRow,
  DayRow,
  HeatRow,
  ItemRow,
  LocRow,
  NamedQty,
  PeriodRow,
  ReconstructRow,
  UsedItemRow,
} from "@/lib/sparepart/overviewQueryTypes";
import type { OverviewSqlContext } from "@/lib/sparepart/overviewSql";

export type OverviewQueryBundle = {
  categories: SparepartCategory[];
  catStats: CatStatRow[];
  catMoves: CatMoveRow[];
  itemSummary: { total_items: number; total_stock: number; low_stock: number } | undefined;
  reconstructRows: ReconstructRow[];
  monthMove: CountRow | undefined;
  prevMove: CountRow | undefined;
  inMonth: CountRow | undefined;
  outMonth: CountRow | undefined;
  txMonth: CountRow | undefined;
  periodRows: PeriodRow[];
  typeRows: NamedQty[];
  trendRows: DayCatRow[];
  sparkRows: DayRow[];
  locRows: LocRow[];
  heatRows: HeatRow[];
  topRows: ItemRow[];
  lowRows: ItemRow[];
  usedRows: UsedItemRow[];
  heatDayRows: DayRow[];
  activeLocs: { qty: number } | undefined;
  sparseRows: ItemRow[];
};

export async function fetchOverviewQueryBundle(args: {
  sql: OverviewSqlContext;
  period: DateRange;
  prev: DateRange;
  barGroupSql: string;
  trendGroupSql: string;
  sparkFrom: string;
}): Promise<OverviewQueryBundle> {
  const { sql, period, prev, barGroupSql, trendGroupSql, sparkFrom } = args;
  const {
    catMatch,
    catSql,
    catParams,
    itemCatJoin,
    itemWhere,
    itemParams,
    moveJoin,
    moveWhere,
    moveParams,
  } = sql;

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
    usedRows,
    heatDayRows,
    [activeLocs],
    sparseRows,
  ] = await Promise.all([
    query<SparepartCategory[]>(
      `SELECT id, code, name_en, name_cn, sort_order, is_active
         FROM sparepart_categories
         WHERE is_active = 1
         ORDER BY sort_order ASC, code ASC`
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
      catParams
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
      catMatch ? [period.start, period.end, ...catParams] : [period.start, period.end]
    ),
    query<{ total_items: number; total_stock: number; low_stock: number }[]>(
      `SELECT
           COUNT(*) AS total_items,
           COALESCE(SUM(i.stock_current), 0) AS total_stock,
           SUM(CASE WHEN ${LOW_STOCK_SQL} THEN 1 ELSE 0 END) AS low_stock
         ${itemCatJoin}
         WHERE ${itemWhere}`,
      itemParams
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
      [period.start, period.end, ...itemParams]
    ),
    query<CountRow[]>(
      `SELECT
           COALESCE(SUM(${MOVEMENT_VOLUME_SQL}), 0) AS qty,
           COUNT(DISTINCT d.id) AS docs
         ${moveJoin}
         WHERE ${moveWhere}`,
      moveParams(period.start, period.end)
    ),
    query<CountRow[]>(
      `SELECT
           COALESCE(SUM(${MOVEMENT_VOLUME_SQL}), 0) AS qty,
           COUNT(DISTINCT d.id) AS docs
         ${moveJoin}
         WHERE ${moveWhere}`,
      moveParams(prev.start, prev.end)
    ),
    query<CountRow[]>(
      `SELECT
           COALESCE(SUM(${IN_QTY_SQL}), 0) AS qty,
           COUNT(DISTINCT CASE WHEN d.movement_type = '101' THEN d.id END) AS docs
         ${moveJoin}
         WHERE ${moveWhere}`,
      moveParams(period.start, period.end)
    ),
    query<CountRow[]>(
      `SELECT
           COALESCE(SUM(${OUT_QTY_SQL}), 0) AS qty,
           COUNT(DISTINCT CASE WHEN d.movement_type = '201' THEN d.id END) AS docs
         ${moveJoin}
         WHERE ${moveWhere}`,
      moveParams(period.start, period.end)
    ),
    query<CountRow[]>(
      `SELECT 0 AS qty, COUNT(DISTINCT d.id) AS docs
         ${moveJoin}
         WHERE ${moveWhere}`,
      moveParams(period.start, period.end)
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
      catMatch ? [period.start, period.end, ...catParams] : [period.start, period.end]
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
      moveParams(period.start, period.end)
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
      catMatch ? [period.start, period.end, ...catParams] : [period.start, period.end]
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
      catMatch ? [sparkFrom, period.end, ...catParams] : [sparkFrom, period.end]
    ),
    query<LocRow[]>(
      `SELECT
           loc.id AS location_id, loc.code, loc.name_en, loc.name_cn,
           COALESCE(SUM(b.qty), 0) AS qty
         FROM sparepart_storage_locations loc
         LEFT JOIN sparepart_stock_balances b ON b.storage_location_id = loc.id
         LEFT JOIN sparepart_items i ON i.id = b.item_id AND i.deleted_at IS NULL
         LEFT JOIN sparepart_categories c ON c.id = i.category_id
         WHERE loc.is_active = 1
           ${catMatch ? `AND (i.id IS NULL OR ${catMatch.sql})` : ""}
         GROUP BY loc.id, loc.code, loc.name_en, loc.name_cn
         ORDER BY qty DESC, loc.name_en ASC`,
      catParams
    ),
    query<HeatRow[]>(
      `SELECT
           c.code AS category_code,
           loc.id AS location_id,
           loc.name_en AS location_name_en,
           loc.name_cn AS location_name_cn,
           COALESCE(SUM(b.qty), 0) AS qty
         FROM sparepart_categories c
         CROSS JOIN sparepart_storage_locations loc
         LEFT JOIN sparepart_items i
           ON i.category_id = c.id AND i.deleted_at IS NULL
         LEFT JOIN sparepart_stock_balances b
           ON b.item_id = i.id AND b.storage_location_id = loc.id
         WHERE c.is_active = 1 AND loc.is_active = 1
           ${catSql}
         GROUP BY c.code, loc.id, loc.name_en, loc.name_cn, c.sort_order
         ORDER BY c.sort_order ASC, loc.name_en ASC`,
      catParams
    ),
    query<ItemRow[]>(
      `SELECT i.code, i.name_en, i.name_cn, c.code AS category_code,
                c.name_en AS category_name_en, c.name_cn AS category_name_cn,
                u.code AS uom_code, i.stock_current, i.min_stock
         ${itemCatJoin}
         WHERE ${itemWhere} AND ${LOW_STOCK_SQL} AND i.stock_current <= 0
         ORDER BY i.code ASC
         LIMIT 200`,
      itemParams
    ),
    query<ItemRow[]>(
      `SELECT i.code, i.name_en, i.name_cn, c.code AS category_code,
                c.name_en AS category_name_en, c.name_cn AS category_name_cn,
                u.code AS uom_code, i.stock_current, i.min_stock
         ${itemCatJoin}
         WHERE ${itemWhere} AND ${LOW_STOCK_SQL} AND i.stock_current > 0
         ORDER BY i.stock_current ASC, i.code ASC
         LIMIT 200`,
      itemParams
    ),
    query<UsedItemRow[]>(
      `SELECT
           i.code, i.name_en, i.name_cn, c.code AS category_code,
           c.name_en AS category_name_en, c.name_cn AS category_name_cn,
           u.code AS uom_code,
           COALESCE(SUM(${OUT_QTY_SQL}), 0) AS qty
         ${moveJoin}
         JOIN uoms u ON u.id = i.uom_id
         WHERE ${moveWhere}
         GROUP BY i.id, i.code, i.name_en, i.name_cn, c.code, c.name_en, c.name_cn, u.code
         HAVING qty > 0
         ORDER BY qty DESC, i.code ASC
         LIMIT 5`,
      moveParams(period.start, period.end)
    ),
    query<DayRow[]>(
      `SELECT
           DATE_FORMAT(d.posting_date, '%Y-%m-%d') AS day_key,
           COALESCE(SUM(${MOVEMENT_VOLUME_SQL}), 0) AS qty
         ${moveJoin}
         WHERE ${moveWhere}
         GROUP BY DATE_FORMAT(d.posting_date, '%Y-%m-%d')`,
      moveParams(period.start, period.end)
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
      catParams
    ),
    query<ItemRow[]>(
      `SELECT i.code, i.name_en, i.name_cn, c.code AS category_code,
                c.name_en AS category_name_en, c.name_cn AS category_name_cn,
                u.code AS uom_code, i.stock_current, i.min_stock
         ${itemCatJoin}
         WHERE ${itemWhere}
         ORDER BY i.code ASC
         LIMIT 3`,
      itemParams
    ),
  ]);

  return {
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
  };
}
