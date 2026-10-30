import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { contentDispositionAttachment, exportFilename } from "@/lib/exportFilenames";
import { buildLogsCenterExport } from "@/lib/logs-center/export";
import {
  LOGS_CENTER_SELECT,
  buildLogsCenterWhere,
  logsCenterFromSql,
  parseLogsCenterDateTime,
  type LogsCenterEventRow,
} from "@/lib/logs-center/listQuery";
import type { Lang } from "@/lib/types";

export const runtime = "nodejs";

function parseLang(raw: string | null): Lang {
  return raw === "cn" ? "cn" : "en";
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
    const lang = parseLang(params.get("lang"));
    const from = parseLogsCenterDateTime(params.get("from"));
    const to = parseLogsCenterDateTime(params.get("to"));
    const { whereSql, values } = buildLogsCenterWhere({
      moduleName: params.get("module") ?? "",
      action: params.get("action") ?? "",
      q: params.get("q") ?? "",
      from,
      to,
    });
    const fromSql = logsCenterFromSql(whereSql);
    const rows = await query<LogsCenterEventRow[]>(
      `${LOGS_CENTER_SELECT}
       ${fromSql}
       ORDER BY e.id DESC`,
      values
    );

    const buffer = await buildLogsCenterExport(rows, lang);
    const filename = exportFilename("logsCenter", lang, {
      start: from?.slice(0, 10),
      end: to?.slice(0, 10),
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": contentDispositionAttachment(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/logs-center/export failed", error);
    return NextResponse.json({ error: "Failed to export Logs Center." }, { status: 500 });
  }
}
