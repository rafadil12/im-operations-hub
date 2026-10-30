const MODULES = new Set([
  "auth",
  "daily-operation",
  "sparepart",
  "report",
  "safety",
  "training",
  "itsm",
  "organization",
  "settings",
  "system",
]);

const ACTIONS = new Set(["login", "logout", "create", "update", "delete"]);

/** Older rows still store save/submit/import/etc.; treat them as update. */
const UPDATE_ACTIONS = ["update", "change", "save", "submit", "reopen", "import"];

export type LogsCenterListFilters = {
  moduleName?: string;
  action?: string;
  q?: string;
  from?: string | null;
  to?: string | null;
};

export type LogsCenterEventRow = {
  id: number;
  created_at: string;
  module: string;
  action: string;
  object_type: string | null;
  object_ref: string | null;
  summary: string;
  summary_cn: string | null;
  changes_json: unknown;
  links_json: unknown;
  ip_address: string | null;
  user_agent: string | null;
  actor_label: string | null;
  employee_no: string | null;
  name_en: string | null;
  name_cn: string | null;
};

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export function parseLogsCenterDateTime(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().replace("T", " ");
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) return null;
  return normalized;
}

export function buildLogsCenterWhere(filters: LogsCenterListFilters): {
  whereSql: string;
  values: unknown[];
} {
  const where: string[] = [];
  const values: unknown[] = [];
  const moduleName = filters.moduleName?.trim() ?? "";
  const action = filters.action?.trim() ?? "";
  const q = (filters.q ?? "").trim().slice(0, 100);
  const from = filters.from ?? null;
  const to = filters.to ?? null;

  if (MODULES.has(moduleName)) {
    where.push("e.module = ?");
    values.push(moduleName);
  }
  if (ACTIONS.has(action)) {
    if (action === "update") {
      where.push(`e.action IN (${UPDATE_ACTIONS.map(() => "?").join(", ")})`);
      values.push(...UPDATE_ACTIONS);
    } else {
      where.push("e.action = ?");
      values.push(action);
    }
  }
  if (from) {
    where.push("e.created_at >= ?");
    values.push(from);
  }
  if (to) {
    where.push("e.created_at < DATE_ADD(?, INTERVAL 1 SECOND)");
    values.push(to);
  }
  if (q) {
    where.push(
      `(e.summary LIKE ? ESCAPE '\\\\' OR e.summary_cn LIKE ? ESCAPE '\\\\' OR e.object_ref LIKE ? ESCAPE '\\\\' OR e.actor_label LIKE ? ESCAPE '\\\\' OR u.employee_no LIKE ? ESCAPE '\\\\' OR u.name_en LIKE ? ESCAPE '\\\\' OR u.name_cn LIKE ? ESCAPE '\\\\')`
    );
    const pattern = likePattern(q);
    values.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    values,
  };
}

export function logsCenterFromSql(whereSql: string): string {
  return `
      FROM logs_center_events e
      LEFT JOIN system_users su ON su.id = e.actor_system_user_id
      LEFT JOIN users u ON u.id = COALESCE(e.actor_user_id, su.user_id)
      ${whereSql}
    `;
}

export const LOGS_CENTER_SELECT = `SELECT e.id, e.created_at, e.module, e.action, e.object_type, e.object_ref,
              e.summary, e.summary_cn, e.changes_json, e.links_json,
              e.ip_address, e.user_agent, e.actor_label,
              u.employee_no, u.name_en, u.name_cn`;
