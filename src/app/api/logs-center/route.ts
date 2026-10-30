import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  LOGS_CENTER_SELECT,
  buildLogsCenterWhere,
  logsCenterFromSql,
  parseLogsCenterDateTime,
  type LogsCenterEventRow,
} from "@/lib/logs-center/listQuery";

export async function GET(request: NextRequest) {
  const gate = await requireAnyPermission([
    PERMISSIONS.settingsAccess,
    PERMISSIONS.adminRolesManage,
    PERMISSIONS.adminAccountsManage,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const params = request.nextUrl.searchParams;
    const from = parseLogsCenterDateTime(params.get("from"));
    const to = parseLogsCenterDateTime(params.get("to"));
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 20));

    const { whereSql, values } = buildLogsCenterWhere({
      moduleName: params.get("module") ?? "",
      action: params.get("action") ?? "",
      q: params.get("q") ?? "",
      from,
      to,
    });
    const fromSql = logsCenterFromSql(whereSql);

    const totals = await query<{ total: number }[]>(`SELECT COUNT(*) AS total ${fromSql}`, values);
    const total = Number(totals[0]?.total ?? 0);
    const offset = (page - 1) * pageSize;
    const rows = await query<LogsCenterEventRow[]>(
      `${LOGS_CENTER_SELECT}
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
