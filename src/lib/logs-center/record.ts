import { describeWrite, shouldSkipWrite, summarizeWrites, type SqlWrite } from "./describeWrite";

export type LogsCenterInput = {
  module: string;
  action: string;
  summary: string;
  actorSystemUserId?: number | null;
  actorUserId?: number | null;
  actorLabel?: string | null;
};

export async function recordLogsCenter(input: LogsCenterInput): Promise<void> {
  try {
    const { pool } = await import("@/lib/db");
    await pool.query(
      `INSERT INTO logs_center_events
        (actor_system_user_id, actor_user_id, actor_label, module, action, summary)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.actorSystemUserId ?? null,
        input.actorUserId ?? null,
        input.actorLabel?.slice(0, 255) ?? null,
        input.module.slice(0, 64),
        input.action.slice(0, 32),
        input.summary.slice(0, 500),
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

export async function persistSqlWrites(sqls: string[]): Promise<void> {
  const writes: SqlWrite[] = [];
  for (const sql of sqls) {
    const write = describeWrite(sql);
    if (write && !shouldSkipWrite(sql, write)) writes.push(write);
  }
  if (writes.length === 0) return;
  const summary = summarizeWrites(writes);
  const actor = await actorFromRequest();
  await recordLogsCenter({ ...summary, ...actor });
}
