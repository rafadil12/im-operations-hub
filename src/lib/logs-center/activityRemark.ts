import { query } from "@/lib/db";
import type { MesDataInput } from "@/lib/types";
import type { LogsCenterInput } from "./record";
import { renderRemark, type RemarkChange, type RemarkLink } from "./renderRemark";

type Named = { name_en: string | null; name_cn: string | null };

type Snapshot = {
  status_id: number;
  type_id: number;
  description_en: string | null;
  description_cn: string | null;
  solution_en: string | null;
  solution_cn: string | null;
  start_time: string;
  end_time: string | null;
  status_en: string | null;
  status_cn: string | null;
  type_en: string | null;
  type_cn: string | null;
};

function sameText(left: string | null | undefined, right: string | null | undefined): boolean {
  return (left ?? "").trim() === (right ?? "").trim();
}

function clock(value: string | null | undefined): string {
  return (value ?? "").replace("T", " ").slice(0, 16);
}

async function named(table: "daily_operation_status" | "daily_operation_type", id: number): Promise<Named> {
  const rows = await query<Named[]>(
    `SELECT name_en, name_cn FROM ${table} WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? { name_en: null, name_cn: null };
}

export async function loadActivitySnapshot(id: number): Promise<Snapshot | null> {
  const rows = await query<Snapshot[]>(
    `SELECT r.status_id, r.type_id, r.description_en, r.description_cn, r.solution_en, r.solution_cn,
            r.start_time, r.end_time,
            st.name_en AS status_en, st.name_cn AS status_cn,
            ty.name_en AS type_en, ty.name_cn AS type_cn
     FROM daily_operation_record r
     LEFT JOIN daily_operation_status st ON st.id = r.status_id
     LEFT JOIN daily_operation_type ty ON ty.id = r.type_id
     WHERE r.id = ? AND r.deleted_at IS NULL
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function goodsIssueLink(input: {
  ref: string;
  qty: number;
  itemId: number;
  locationId: number;
  recipient: string;
}): Promise<RemarkLink> {
  const rows = await query<{ item_code: string; uom: string | null; loc_en: string | null; loc_cn: string | null }[]>(
    `SELECT i.code AS item_code, u.code AS uom, l.name_en AS loc_en, l.name_cn AS loc_cn
     FROM sparepart_items i
     LEFT JOIN sparepart_uoms u ON u.id = i.uom_id
     LEFT JOIN sparepart_storage_locations l ON l.id = ?
     WHERE i.id = ?
     LIMIT 1`,
    [input.locationId, input.itemId]
  );
  const row = rows[0];
  const qty = `${input.qty} ${row?.uom ?? "PCS"} ${row?.item_code ?? ""}`.trim();
  const locEn = row?.loc_en?.trim() || "storage";
  const locCn = row?.loc_cn?.trim() || locEn;
  const to = input.recipient.trim() || "-";
  return {
    type: "goods_issue",
    ref: input.ref,
    detailEn: `${qty} to ${to} from ${locEn}`,
    detailCn: `${qty} 发给 ${to}，从 ${locCn}`,
  };
}

function base(action: string, id: number, changes: RemarkChange[], links: RemarkLink[]): LogsCenterInput {
  const event = {
    action,
    summary: "",
    objectType: "activity",
    objectRef: String(id),
    changes,
    links,
  };
  return {
    module: "daily-operation",
    action,
    objectType: "activity",
    objectRef: String(id),
    changes,
    links,
    summary: renderRemark(event, "en"),
  };
}

export function activityCreatedRemark(id: number, links: RemarkLink[] = []): LogsCenterInput {
  return base("create", id, [], links);
}

export function activityDeletedRemark(id: number): LogsCenterInput {
  return base("delete", id, [], []);
}

export async function activityUpdatedRemark(
  id: number,
  before: Snapshot,
  after: MesDataInput,
  links: RemarkLink[] = []
): Promise<LogsCenterInput> {
  const changes: RemarkChange[] = [];
  if (before.status_id !== after.status_id) {
    const next = await named("daily_operation_status", after.status_id);
    changes.push({
      field: "status",
      from: before.status_en,
      fromCn: before.status_cn,
      to: next.name_en,
      toCn: next.name_cn,
    });
  }
  if (before.type_id !== after.type_id) {
    const next = await named("daily_operation_type", after.type_id);
    changes.push({
      field: "type",
      from: before.type_en,
      fromCn: before.type_cn,
      to: next.name_en,
      toCn: next.name_cn,
    });
  }
  if (clock(before.start_time) !== clock(after.start_time)) {
    changes.push({ field: "start", from: clock(before.start_time), to: clock(after.start_time) });
  }
  if (clock(before.end_time) !== clock(after.end_time)) {
    changes.push({ field: "end", from: clock(before.end_time), to: clock(after.end_time) });
  }
  if (!sameText(before.solution_en, after.solution_en) || !sameText(before.solution_cn, after.solution_cn)) {
    changes.push({ field: "solution" });
  }
  if (
    !sameText(before.description_en, after.description_en) ||
    !sameText(before.description_cn, after.description_cn)
  ) {
    changes.push({ field: "description" });
  }
  return base("update", id, changes, links);
}
