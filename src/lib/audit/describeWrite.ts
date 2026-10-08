export type SqlWrite = {
  verb: "insert" | "update" | "delete";
  table: string;
  softDelete: boolean;
};

const VERB = /^(insert|update|delete)\b/i;

export function describeWrite(sql: string): SqlWrite | null {
  const trimmed = sql.replace(/\s+/g, " ").trim();
  const verbMatch = VERB.exec(trimmed);
  if (!verbMatch) return null;
  const verb = verbMatch[1].toLowerCase() as SqlWrite["verb"];

  let table = "";
  if (verb === "insert") {
    table = /insert\s+into\s+`?([a-z0-9_]+)`?/i.exec(trimmed)?.[1] ?? "";
  } else if (verb === "update") {
    table = /update\s+(?:ignore\s+)?`?([a-z0-9_]+)`?/i.exec(trimmed)?.[1] ?? "";
  } else {
    table = /delete\s+from\s+`?([a-z0-9_]+)`?/i.exec(trimmed)?.[1] ?? "";
  }
  if (!table) return null;

  return {
    verb,
    table: table.toLowerCase(),
    softDelete: verb === "update" && /\bdeleted_at\b/i.test(trimmed),
  };
}

/** Skip the audit table itself and the login timestamp touch. */
export function shouldSkipWrite(sql: string, write: SqlWrite): boolean {
  if (write.table === "audit_events") return true;
  if (
    write.table === "system_users" &&
    /\blast_login_at\b/i.test(sql) &&
    !/\bpassword_hash\b/i.test(sql) &&
    !/\brole_id\b/i.test(sql) &&
    !/\bis_active\b/i.test(sql) &&
    !/\bsession_version\b/i.test(sql)
  ) {
    return true;
  }
  return false;
}

export function moduleForTable(table: string): string {
  if (table.startsWith("sparepart_")) return "sparepart";
  if (table.startsWith("report_")) return "report";
  if (table.startsWith("safety_")) return "safety";
  if (table.startsWith("training_")) return "training";
  if (table.startsWith("itsm_")) return "itsm";
  if (
    table.startsWith("mes_") ||
    table === "categories" ||
    table === "subcategories" ||
    table === "divisions" ||
    table === "users"
  ) {
    return "daily-operation";
  }
  if (table === "system_users" || table === "roles" || table === "role_permissions" || table === "permissions") {
    return "settings";
  }
  if (
    table.startsWith("attendance_") ||
    table.startsWith("shift_") ||
    table.startsWith("work_schedule") ||
    table.startsWith("organization_") ||
    table === "employees" ||
    table === "positions"
  ) {
    return "organization";
  }
  return "system";
}

export function actionForWrite(write: SqlWrite): "create" | "update" | "delete" {
  if (write.softDelete || write.verb === "delete") return "delete";
  if (write.verb === "insert") return "create";
  return "update";
}

export function summarizeWrites(writes: SqlWrite[]): {
  module: string;
  action: string;
  summary: string;
} {
  const parts = [...new Set(writes.map((write) => `${actionForWrite(write)} ${write.table}`))];
  const modules = [...new Set(writes.map((write) => moduleForTable(write.table)))];
  const actions = [...new Set(writes.map((write) => actionForWrite(write)))];
  return {
    module: modules.length === 1 ? modules[0] : "system",
    action: actions.length === 1 ? actions[0] : "change",
    summary: parts.join(", ").slice(0, 500),
  };
}
