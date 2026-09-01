import type { ReportLine, ReportLineRow } from "./types";

const PROJECT_NAME_EN = /^(project|development)$/i;
const PROJECT_NAME_CN = /^(项目|开发事件)$/;

export function isSafetyAreaCode(code: string | undefined | null): boolean {
  return (code ?? "").toUpperCase() === "SAFETY";
}

export function isDivisionAreaCode(code: string | undefined | null): boolean {
  return !isSafetyAreaCode(code);
}

export function isProjectSubItem(nameEn: string | null | undefined, nameCn: string | null | undefined): boolean {
  const en = (nameEn ?? "").trim();
  const cn = (nameCn ?? "").trim();
  return PROJECT_NAME_EN.test(en) || PROJECT_NAME_CN.test(cn);
}

export function isProjectLine(line: Pick<ReportLine, "subItemNameEn" | "subItemNameCn">): boolean {
  return isProjectSubItem(line.subItemNameEn, line.subItemNameCn);
}

export function isProjectRow(row: Pick<ReportLineRow, "sub_item_name_en" | "sub_item_name_cn">): boolean {
  return isProjectSubItem(row.sub_item_name_en, row.sub_item_name_cn);
}

export function projectStatus(rate: number | null | undefined): "on_track" | "at_risk" | "delayed" {
  if (rate == null || !Number.isFinite(rate)) return "delayed";
  const pct = rate * 100;
  if (pct >= 90) return "on_track";
  if (pct >= 70) return "at_risk";
  return "delayed";
}
