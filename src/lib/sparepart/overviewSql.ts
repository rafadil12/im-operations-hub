export type CategoryMatch = { sql: string; params: string[] };

export type OverviewSqlContext = {
  catMatch: CategoryMatch | null;
  catSql: string;
  catParams: string[];
  itemCatJoin: string;
  itemWhere: string;
  itemParams: string[];
  moveJoin: string;
  moveWhere: string;
  moveParams: (start: string, end: string) => string[];
};

/** Build shared JOIN/WHERE fragments for sparepart overview queries. */
export function buildOverviewSql(catMatch: CategoryMatch | null): OverviewSqlContext {
  const catSql = catMatch ? `AND ${catMatch.sql}` : "";
  const catParams = catMatch?.params ?? [];

  const itemCatJoin = `
      FROM sparepart_items i
      JOIN sparepart_categories c ON c.id = i.category_id
      JOIN uoms u ON u.id = i.uom_id
    `;
  const itemWhere = ["i.deleted_at IS NULL", catMatch ? catMatch.sql : null]
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

  return {
    catMatch,
    catSql,
    catParams,
    itemCatJoin,
    itemWhere,
    itemParams,
    moveJoin,
    moveWhere,
    moveParams,
  };
}
