import type { Lang } from "@/lib/types";
import en, { type Dict } from "./en";
import cn from "./cn";

export type { Dict };

export const DEFAULT_LANG: Lang = "en";

const dictionaries: Record<Lang, Dict> = { en, cn };

export function getDict(lang: Lang = DEFAULT_LANG): Dict {
  return dictionaries[lang] ?? en;
}

/** Pick the localized master-data name based on the active language. */
export function localizedName(
  item: { name_en: string | null; name_cn: string | null } | null | undefined,
  lang: Lang = DEFAULT_LANG,
): string {
  if (!item) return "-";
  if (lang === "cn") return item.name_cn || item.name_en || "-";
  return item.name_en || item.name_cn || "-";
}
