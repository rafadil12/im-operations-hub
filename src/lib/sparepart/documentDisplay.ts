import { localizedName } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n";
import type { MovementType } from "@/lib/types";

export function movementLabel(type: MovementType, t: Dict): string {
  switch (type) {
    case "101":
      return t.sparepart.movement101;
    case "201":
      return t.sparepart.movement201;
    case "311":
      return t.sparepart.movement311;
    case "102":
      return t.sparepart.movement102;
    case "202":
      return t.sparepart.movement202;
    case "312":
      return t.sparepart.movement312;
    default:
      return type;
  }
}

export function formatPostingDateTime(postingDate: string | null | undefined): string {
  const postingValue = String(postingDate ?? "").trim();
  if (!postingValue) return "-";

  const normalizedPosting = postingValue.replace("T", " ");
  const postingMatch = normalizedPosting.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}:\d{2}:\d{2}))?/
  );
  if (!postingMatch) return postingValue;

  const [, year, month, day, timePart] = postingMatch;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthLabel = months[Number(month) - 1] ?? month;
  const dateLabel = `${day} ${monthLabel} ${year}`;
  return timePart ? `${dateLabel} ${timePart}` : dateLabel;
}

export function formatPostingDateOnly(postingDate: string | null | undefined): string {
  const postingValue = String(postingDate ?? "").trim();
  if (!postingValue) return "-";
  const match = postingValue.replace("T", " ").match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? postingValue.slice(0, 10);
}

export function formatLocationLabel(
  code: string | null | undefined,
  nameEn: string | null | undefined,
  nameCn: string | null | undefined,
  lang: "en" | "cn",
  fallback?: string | null
): string {
  if (code) {
    const name = localizedName({ name_en: nameEn ?? null, name_cn: nameCn ?? null }, lang);
    if (name && name !== "-") return `${code} — ${name}`;
    return code;
  }
  return fallback?.trim() || "-";
}

export function isReversalMovement(type: MovementType): boolean {
  return type === "102" || type === "202" || type === "312";
}

export const DOCUMENTS_TH =
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
export const DOCUMENTS_TD = "px-3 py-2 align-top text-xs text-text-muted";
