import type { RemarkChange, RemarkLink } from "./renderRemark";
import { recordLogsCenter, type LogsCenterInput } from "./record";

type Lang = "en" | "cn";

export type MovementRemarkLine = {
  qty: number;
  itemCode: string;
  uomCode: string | null;
  recipient: string | null;
  fromEn: string | null;
  fromCn: string | null;
  fromCode: string | null;
  toEn: string | null;
  toCn: string | null;
  toCode: string | null;
  fromLevelEn: string | null;
  fromLevelCn: string | null;
  fromLevelCode: string | null;
  toLevelEn: string | null;
  toLevelCn: string | null;
  toLevelCode: string | null;
};

export type MaterialRemarkSnap = {
  name_en: string | null;
  name_cn: string | null;
  brand_en: string | null;
  brand_cn: string | null;
  model: string | null;
  notes: string | null;
  erp_item_code: string | null;
  min_stock: number;
  is_active: number | boolean;
  category_name_en: string | null;
  category_name_cn: string | null;
  uom_code: string | null;
};

export type LocationRemarkSnap = {
  code: string;
  name_en: string | null;
  name_cn: string | null;
  is_active: number | boolean;
};

function trimmed(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function pick(lang: Lang, en: string | null, cn: string | null, code: string | null): string {
  if (lang === "cn") return trimmed(cn) || trimmed(en) || trimmed(code);
  return trimmed(en) || trimmed(cn) || trimmed(code);
}

function place(
  lang: Lang,
  en: string | null,
  cn: string | null,
  code: string | null,
  levelEn: string | null,
  levelCn: string | null,
  levelCode: string | null
): string {
  const location = pick(lang, en, cn, code);
  const level = pick(lang, levelEn, levelCn, levelCode);
  if (location && level) return `${location} / ${level}`;
  return location || level;
}

export function movementObjectType(movementType: string): "goods receipt" | "goods issue" | "transfer" {
  if (movementType === "201" || movementType === "202") return "goods issue";
  if (movementType === "311" || movementType === "312") return "transfer";
  return "goods receipt";
}

export function isReversalMovement(movementType: string): boolean {
  return movementType === "102" || movementType === "202" || movementType === "312";
}

export function movementLineText(line: MovementRemarkLine, movementType: string, lang: Lang): string {
  const kind = movementObjectType(movementType);
  const qty = `${line.qty} ${trimmed(line.uomCode) || "PCS"} ${line.itemCode}`;
  const from = place(
    lang,
    line.fromEn,
    line.fromCn,
    line.fromCode,
    line.fromLevelEn,
    line.fromLevelCn,
    line.fromLevelCode
  );
  const to = place(lang, line.toEn, line.toCn, line.toCode, line.toLevelEn, line.toLevelCn, line.toLevelCode);
  if (kind === "goods issue") {
    const who = trimmed(line.recipient) || "-";
    return lang === "cn" ? `${qty} 发给 ${who}，从 ${from}` : `${qty} issued to ${who}, from ${from}`;
  }
  if (kind === "transfer") {
    return lang === "cn" ? `${qty} 从 ${from} 到 ${to}` : `${qty} from ${from} to ${to}`;
  }
  return lang === "cn" ? `${qty} 入 ${from}` : `${qty} into ${from}`;
}

function textChange(
  field: string,
  before: string | null | undefined,
  after: string | null | undefined
): RemarkChange | null {
  const from = trimmed(before);
  const to = trimmed(after);
  if (from === to) return null;
  return {
    field,
    from: from || "none",
    to: to || "none",
    fromCn: from || "无",
    toCn: to || "无",
  };
}

function active(value: number | boolean): boolean {
  return value === true || Number(value) === 1;
}

export function materialUpdateChanges(before: MaterialRemarkSnap, after: MaterialRemarkSnap): RemarkChange[] {
  const changes: RemarkChange[] = [{ field: "name", to: after.name_en, toCn: after.name_cn }];
  const pairs: Array<[string, string | null, string | null]> = [
    ["name_en", before.name_en, after.name_en],
    ["name_cn", before.name_cn, after.name_cn],
    ["brand_en", before.brand_en, after.brand_en],
    ["brand_cn", before.brand_cn, after.brand_cn],
    ["model", before.model, after.model],
    ["erp_code", before.erp_item_code, after.erp_item_code],
  ];
  for (const [field, left, right] of pairs) {
    const change = textChange(field, left, right);
    if (change) changes.push(change);
  }
  if (trimmed(before.notes) !== trimmed(after.notes)) changes.push({ field: "notes" });
  if (Number(before.min_stock) !== Number(after.min_stock)) {
    changes.push({
      field: "min_stock",
      from: String(before.min_stock),
      to: String(after.min_stock),
    });
  }
  if (active(before.is_active) !== active(after.is_active)) {
    const beforeActive = active(before.is_active);
    const afterActive = active(after.is_active);
    changes.push({
      field: "status",
      from: beforeActive ? "Active" : "Inactive",
      to: afterActive ? "Active" : "Inactive",
      fromCn: beforeActive ? "启用" : "停用",
      toCn: afterActive ? "启用" : "停用",
    });
  }
  const uom = textChange("uom", before.uom_code, after.uom_code);
  if (uom) changes.push(uom);
  if (
    trimmed(before.category_name_en) !== trimmed(after.category_name_en) ||
    trimmed(before.category_name_cn) !== trimmed(after.category_name_cn)
  ) {
    changes.push({
      field: "item category",
      from: trimmed(before.category_name_en) || "none",
      to: trimmed(after.category_name_en) || "none",
      fromCn: trimmed(before.category_name_cn) || trimmed(before.category_name_en) || "无",
      toCn: trimmed(after.category_name_cn) || trimmed(after.category_name_en) || "无",
    });
  }
  return changes;
}

export function locationUpdateChanges(before: LocationRemarkSnap, after: LocationRemarkSnap): RemarkChange[] {
  const changes: RemarkChange[] = [{ field: "name", to: after.name_en, toCn: after.name_cn }];
  const code = textChange("code", before.code, after.code);
  if (code) changes.push(code);
  const nameEn = textChange("name_en", before.name_en, after.name_en);
  if (nameEn) changes.push(nameEn);
  const nameCn = textChange("name_cn", before.name_cn, after.name_cn);
  if (nameCn) changes.push(nameCn);
  if (active(before.is_active) !== active(after.is_active)) {
    const beforeActive = active(before.is_active);
    const afterActive = active(after.is_active);
    changes.push({
      field: "status",
      from: beforeActive ? "Active" : "Inactive",
      to: afterActive ? "Active" : "Inactive",
      fromCn: beforeActive ? "启用" : "停用",
      toCn: afterActive ? "启用" : "停用",
    });
  }
  return changes;
}

export function hasRemarkDetail(changes: RemarkChange[]): boolean {
  return changes.some((change) => change.field !== "name");
}

type GoodsDocRow = {
  doc_number: string;
  movement_type: string;
  recipient: string | null;
  original_doc: string | null;
  qty: number;
  item_code: string;
  uom_code: string | null;
  from_en: string | null;
  from_cn: string | null;
  from_code: string | null;
  to_en: string | null;
  to_cn: string | null;
  to_code: string | null;
  from_level_en: string | null;
  from_level_cn: string | null;
  from_level_code: string | null;
  to_level_en: string | null;
  to_level_cn: string | null;
  to_level_code: string | null;
};

function lineFromRow(row: GoodsDocRow): MovementRemarkLine {
  return {
    qty: Number(row.qty),
    itemCode: row.item_code,
    uomCode: row.uom_code,
    recipient: row.recipient,
    fromEn: row.from_en,
    fromCn: row.from_cn,
    fromCode: row.from_code,
    toEn: row.to_en,
    toCn: row.to_cn,
    toCode: row.to_code,
    fromLevelEn: row.from_level_en,
    fromLevelCn: row.from_level_cn,
    fromLevelCode: row.from_level_code,
    toLevelEn: row.to_level_en,
    toLevelCn: row.to_level_cn,
    toLevelCode: row.to_level_code,
  };
}

export function goodsDocumentInput(rows: GoodsDocRow[]): LogsCenterInput | null {
  const first = rows[0];
  if (!first) return null;
  const reversal = isReversalMovement(first.movement_type);
  const detailEn = rows.map((row) => movementLineText(lineFromRow(row), first.movement_type, "en")).join("; ");
  const detailCn = rows.map((row) => movementLineText(lineFromRow(row), first.movement_type, "cn")).join("；");
  const links: RemarkLink[] = [];
  if (reversal && trimmed(first.original_doc)) {
    links.push({ type: "reversal_of", ref: trimmed(first.original_doc) });
  }
  return {
    module: "sparepart",
    action: reversal ? "reverse" : "post",
    objectType: movementObjectType(first.movement_type),
    objectRef: first.doc_number,
    changes: [{ field: "lines", to: detailEn, toCn: detailCn }],
    links,
  };
}

const GOODS_DOC_SQL = `
  SELECT d.doc_number, d.movement_type, d.recipient, orig.doc_number AS original_doc,
         i.qty, it.code AS item_code, u.code AS uom_code,
         sl.name_en AS from_en, sl.name_cn AS from_cn, sl.code AS from_code,
         tl.name_en AS to_en, tl.name_cn AS to_cn, tl.code AS to_code,
         fl.name_en AS from_level_en, fl.name_cn AS from_level_cn, fl.code AS from_level_code,
         tfl.name_en AS to_level_en, tfl.name_cn AS to_level_cn, tfl.code AS to_level_code
  FROM sparepart_mat_docs d
  JOIN sparepart_mat_doc_items i ON i.doc_id = d.id
  JOIN sparepart_items it ON it.id = i.item_id
  LEFT JOIN sparepart_uoms u ON u.id = it.uom_id
  LEFT JOIN sparepart_storage_locations sl ON sl.id = i.storage_location_id
  LEFT JOIN sparepart_storage_locations tl ON tl.id = i.to_storage_location_id
  LEFT JOIN sparepart_stock_levels fl ON fl.id = i.storage_level_id
  LEFT JOIN sparepart_stock_levels tfl ON tfl.id = i.to_storage_level_id
  LEFT JOIN sparepart_mat_docs orig ON orig.id = d.reversal_of_doc_id
  WHERE d.id = ?
  ORDER BY i.line_no
`;

export async function recordPostedGoodsDocument(docId: number): Promise<void> {
  try {
    const { query } = await import("@/lib/db");
    const rows = await query<GoodsDocRow[]>(GOODS_DOC_SQL, [docId]);
    const input = goodsDocumentInput(rows);
    if (input) await recordLogsCenter(input);
  } catch (error) {
    console.error("sparepart goods document remark failed", error);
  }
}
