import { AsyncLocalStorage } from "node:async_hooks";
import {
  actionForWrite,
  describeWrite,
  moduleForTable,
  shouldSkipWrite,
  summarizeWrites,
  type SqlWrite,
} from "./describeWrite";
import { renderRemark, type RemarkChange, type RemarkLink } from "./renderRemark";

const suppressLogs = new AsyncLocalStorage<boolean>();

export function suppressLogsCenter<T>(fn: () => Promise<T>): Promise<T> {
  return suppressLogs.run(true, fn);
}

export type LogsCenterInput = {
  module: string;
  action: string;
  summary?: string;
  objectType?: string | null;
  objectRef?: string | null;
  changes?: RemarkChange[] | null;
  links?: RemarkLink[] | null;
  actorSystemUserId?: number | null;
  actorUserId?: number | null;
  actorLabel?: string | null;
};

const OBJECT_NOUN: Record<string, string> = {
  daily_operation_record: "activity",
  daily_operation_categories: "category",
  daily_operation_subcategories: "subcategory",
  daily_operation_type: "type",
  daily_operation_status: "status",
  access_roles: "role",
  access_permissions: "permission",
  access_role_permissions: "role",
  system_users: "account",
  sparepart_items: "material",
  sparepart_mat_docs: "goods document",
  sparepart_uoms: "unit of measure",
  sparepart_storage_locations: "storage location",
  users: "user",
};

export async function recordLogsCenter(input: LogsCenterInput): Promise<void> {
  try {
    const summary = (
      input.summary ??
      renderRemark(
        {
          action: input.action,
          summary: "",
          objectType: input.objectType,
          objectRef: input.objectRef,
          changes: input.changes,
          links: input.links,
        },
        "en"
      )
    ).slice(0, 500);
    const { pool } = await import("@/lib/db");
    await pool.query(
      `INSERT INTO logs_center_events
        (actor_system_user_id, actor_user_id, actor_label, module, action,
         object_type, object_ref, summary, changes_json, links_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.actorSystemUserId ?? null,
        input.actorUserId ?? null,
        input.actorLabel?.slice(0, 255) ?? null,
        input.module.slice(0, 64),
        input.action.slice(0, 32),
        input.objectType?.slice(0, 64) ?? null,
        input.objectRef?.slice(0, 64) ?? null,
        summary,
        input.changes?.length ? JSON.stringify(input.changes) : null,
        input.links?.length ? JSON.stringify(input.links) : null,
      ]
    );
  } catch (error) {
    console.error("logs center write failed", error);
  }
}

async function actorFromRequest(): Promise<
  Pick<LogsCenterInput, "actorSystemUserId" | "actorUserId" | "actorLabel">
> {
  try {
    const { readSession } = await import("@/lib/auth/session");
    const session = await readSession();
    if (!session) {
      return { actorSystemUserId: null, actorUserId: null, actorLabel: null };
    }
    return {
      actorSystemUserId: session.systemUserId,
      actorUserId: session.userId,
      actorLabel: session.roleName,
    };
  } catch {
    return { actorSystemUserId: null, actorUserId: null, actorLabel: null };
  }
}

function friendlyWrite(write: SqlWrite): { noun: string; action: string } {
  return { noun: OBJECT_NOUN[write.table] ?? "record", action: actionForWrite(write) };
}

export async function persistSqlWrites(sqls: string[]): Promise<void> {
  if (suppressLogs.getStore()) return;
  const writes: SqlWrite[] = [];
  for (const sql of sqls) {
    const write = describeWrite(sql);
    if (write && !shouldSkipWrite(sql, write)) writes.push(write);
  }
  if (writes.length === 0) return;
  const summary = summarizeWrites(writes);
  const actor = await actorFromRequest();
  if (writes.length === 1) {
    const friendly = friendlyWrite(writes[0]);
    await recordLogsCenter({
      module: moduleForTable(writes[0].table),
      action: friendly.action,
      objectType: friendly.noun,
      ...actor,
    });
    return;
  }
  const parts = writes.map((write) => {
    const friendly = friendlyWrite(write);
    const verb = friendly.action === "create" ? "Created" : friendly.action === "delete" ? "Deleted" : "Updated";
    return `${verb} ${friendly.noun}`;
  });
  await recordLogsCenter({
    module: summary.module,
    action: summary.action,
    summary: parts.join(", ").slice(0, 500),
    ...actor,
  });
}
