import { execute, query } from "@/lib/db";
import type { MesDataInput } from "@/lib/types";
import {
  CHANGE_REQUEST_TYPE_EN,
  assertIssueComplete,
  issueClientRequestId,
  type ChangeRequestIssueInput,
} from "./changeRequestIssueParse";

export type LinkedIssue = {
  sparepart_mat_doc_id: number | null;
  type_id: number;
};

export async function isChangeRequestType(typeId: number): Promise<boolean> {
  const rows = await query<{ name_en: string | null }[]>(
    "SELECT name_en FROM mes_type WHERE id = ? LIMIT 1",
    [typeId]
  );
  return rows[0]?.name_en === CHANGE_REQUEST_TYPE_EN;
}

export async function loadLinkedIssue(recordId: number): Promise<LinkedIssue | null> {
  const rows = await query<LinkedIssue[]>(
    `SELECT sparepart_mat_doc_id, type_id
     FROM mes_record
     WHERE id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [recordId]
  );
  return rows[0] ?? null;
}

export async function postChangeRequestIssue(opts: {
  recordId: number;
  data: MesDataInput;
  issue: ChangeRequestIssueInput;
  createdBySystemUserId?: number | null;
  createdBy?: string | null;
}): Promise<{ id: number; doc_number: string }> {
  assertIssueComplete(opts.issue);
  const issue = opts.issue;
  const users = await query<{ name_en: string | null; name_cn: string | null }[]>(
    "SELECT name_en, name_cn FROM users WHERE id = ? LIMIT 1",
    [opts.data.user_id]
  );
  const recipient =
    users[0]?.name_en?.trim() || users[0]?.name_cn?.trim() || `User ${opts.data.user_id}`;
  const header =
    opts.data.description_en.trim() || opts.data.description_cn.trim() || "Change Request";
  const { postGoodsMovement } = await import("@/lib/sparepart/posting");

  return postGoodsMovement({
    movement_type: "201",
    posting_date: opts.data.start_time.replace("T", " ").slice(0, 19),
    header_text: `Change Request #${opts.recordId}: ${header}`.slice(0, 255),
    recipient,
    lines: [
      {
        item_id: issue.sparepart_item_id!,
        qty: issue.sparepart_qty!,
        note: `MES ${opts.recordId}`,
        storage_location_id: issue.sparepart_storage_location_id!,
        storage_level_id: issue.sparepart_level_id!,
      },
    ],
    created_by_system_user_id: opts.createdBySystemUserId ?? undefined,
    created_by: opts.createdBy ?? undefined,
    client_request_id: issueClientRequestId(opts.recordId),
  });
}

export async function saveIssueLink(
  recordId: number,
  issue: ChangeRequestIssueInput,
  docId: number
): Promise<void> {
  await execute(
    `UPDATE mes_record
     SET sparepart_item_id = ?,
         sparepart_qty = ?,
         sparepart_storage_location_id = ?,
         sparepart_level_id = ?,
         sparepart_mat_doc_id = ?
     WHERE id = ?`,
    [
      issue.sparepart_item_id,
      issue.sparepart_qty,
      issue.sparepart_storage_location_id,
      issue.sparepart_level_id,
      docId,
      recordId,
    ]
  );
}
