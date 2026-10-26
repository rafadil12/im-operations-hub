import type { RemarkChange } from "./renderRemark";

export type BilingualName = {
  name_en: string | null;
  name_cn: string | null;
};

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function identityChange(name: BilingualName): RemarkChange {
  return { field: "name", to: name.name_en, toCn: name.name_cn };
}

function textChange(
  field: string,
  before: string | null | undefined,
  after: string | null | undefined
): RemarkChange | null {
  const from = clean(before);
  const to = clean(after);
  if (from === to) return null;
  return {
    field,
    from: from || "none",
    to: to || "none",
    fromCn: from || "无",
    toCn: to || "无",
  };
}

export function nameChanges(before: BilingualName, after: BilingualName): RemarkChange[] {
  const changes: RemarkChange[] = [identityChange(after)];
  const english = textChange("name_en", before.name_en, after.name_en);
  if (english) changes.push(english);
  const chinese = textChange("name_cn", before.name_cn, after.name_cn);
  if (chinese) changes.push(chinese);
  return changes;
}

export function linkChange(
  field: "division" | "category",
  before: BilingualName | null,
  after: BilingualName | null
): RemarkChange | null {
  const fromEn = clean(before?.name_en);
  const toEn = clean(after?.name_en);
  const fromCn = clean(before?.name_cn);
  const toCn = clean(after?.name_cn);
  if (fromEn === toEn && fromCn === toCn) return null;
  if (!fromEn && !fromCn && !toEn && !toCn) return null;
  if (!fromEn && !fromCn) {
    return { field, to: toEn || toCn, toCn: toCn || toEn };
  }
  return {
    field,
    from: fromEn || fromCn || "none",
    to: toEn || toCn || "none",
    fromCn: fromCn || fromEn || "无",
    toCn: toCn || toEn || "无",
  };
}

export function hasDetail(changes: RemarkChange[]): boolean {
  return changes.some((change) => change.field !== "name");
}

type NameRow = { name_en: string | null; name_cn: string | null };

async function loadName(sql: string, id: number | null): Promise<BilingualName | null> {
  if (!id || !Number.isInteger(id) || id <= 0) return null;
  const { query } = await import("@/lib/db");
  const rows = await query<NameRow[]>(sql, [id]);
  return rows[0] ?? null;
}

export function loadDivision(id: number | null): Promise<BilingualName | null> {
  return loadName("SELECT name_en, name_cn FROM divisions WHERE id = ? LIMIT 1", id);
}

export function loadCategoryName(id: number | null): Promise<BilingualName | null> {
  return loadName(
    "SELECT name_en, name_cn FROM daily_operation_categories WHERE id = ? LIMIT 1",
    id
  );
}
