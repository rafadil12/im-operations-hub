import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { query } from "@/lib/db";

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

const ACTIONS = new Set(["login", "logout", "create", "update", "delete", "change"]);

type LogRow = {
  id: number;
  created_at: string;
  module: string;
  action: string;
  summary: string;
  actor_label: string | null;
  employee_no: string | null;
  actor_name: string | null;
};

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function dateTime(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().replace("T", " ");
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) return null;
  return normalized;
}

export async function GET(request: NextRequest) {
  const gate = await requireAnyPermission([
    PERMISSIONS.settingsAccess,
    PERMISSIONS.adminRolesManage,
    PERMISSIONS.adminAccountsManage,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const params = request.nextUrl.searchParams;
    const moduleName = params.get("module") ?? "";
    const action = params.get("action") ?? "";
    const q = (params.get("q") ?? "").trim().slice(0, 100);
    const from = dateTime(params.get("from"));
    const to = dateTime(params.get("to"));
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 20));

    const where: string[] = [];
    const values: unknown[] = [];
    if (MODULES.has(moduleName)) {
      where.push("e.module = ?");
      values.push(moduleName);
    }
    if (ACTIONS.has(action)) {
      where.push("e.action = ?");
      values.push(action);
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
        `(e.summary LIKE ? ESCAPE '\\\\' OR e.actor_label LIKE ? ESCAPE '\\\\' OR u.employee_no LIKE ? ESCAPE '\\\\' OR u.name_en LIKE ? ESCAPE '\\\\' OR u.name_cn LIKE ? ESCAPE '\\\\')`
      );
      const pattern = likePattern(q);
      values.push(pattern, pattern, pattern, pattern, pattern);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const fromSql = `
      FROM logs_center_events e
      LEFT JOIN system_users su ON su.id = e.actor_system_user_id
      LEFT JOIN users u ON u.id = COALESCE(e.actor_user_id, su.user_id)
      ${whereSql}
    `;

    const totals = await query<{ total: number }[]>(
      `SELECT COUNT(*) AS total ${fromSql}`,
      values
    );
    const total = Number(totals[0]?.total ?? 0);
    const offset = (page - 1) * pageSize;
    const rows = await query<LogRow[]>(
      `SELECT e.id, e.created_at, e.module, e.action, e.summary, e.actor_label,
              u.employee_no,
              COALESCE(u.name_en, u.employee_no, e.actor_label) AS actor_name
       ${fromSql}
       ORDER BY e.id DESC
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return NextResponse.json({ rows, total, page, pageSize });
  } catch (error) {
    console.error("GET /api/logs-center failed", error);
    return NextResponse.json({ error: "Failed to load Logs Center." }, { status: 500 });
  }
}
