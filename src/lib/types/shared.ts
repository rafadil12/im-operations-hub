export type Lang = "en" | "cn";

export type Theme = "light" | "dark";

export type CountItem = {
  label: string;
  count: number;
};

export type TrendItem = {
  date: string;
  count: number;
};

export type TrendComparison = {
  current: TrendItem[];
  previous: TrendItem[];
};

export type TopPicItem = {
  name: string;
  count: number;
};

export type NamedCount = {
  name_en: string | null;
  name_cn: string | null;
  count: number;
};

export type GroupCount = {
  name: string;
  count: number;
};

/** Match status counts by English name keywords (stable across locale). */
export function namedStatusCount(rows: NamedCount[], keyword: string): number {
  const key = keyword.toLowerCase();
  return rows.find((s) => (s.name_en ?? "").toLowerCase().includes(key))?.count ?? 0;
}
