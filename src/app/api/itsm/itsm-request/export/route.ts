import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { buildItsmExport } from "@/lib/itsmExport";
import type { ItsmRequest } from "@/lib/types";

export const runtime = "nodejs";

const CREATED_DATE_SQL = `
  STR_TO_DATE(created_date, '%d/%m/%Y %h:%i %p')
`;

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    const start = sp.get("start");
    const end = sp.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "Start and end date are required." },
        { status: 400 },
      );
    }

    let sql = `
      SELECT
        request_id,
        subject,
        requester,
        technician,
        due_by_date,
        status,
        created_date,
        site,
        priority,
        group_name,
        is_service_request
      FROM itsm_requests
      WHERE
        ${CREATED_DATE_SQL} >= ?
        AND ${CREATED_DATE_SQL} < DATE_ADD(?, INTERVAL 1 DAY)
    `;

    const params: unknown[] = [start, end];

    const status = sp.get("status");
    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    const priority = sp.get("priority");
    if (priority) {
      sql += " AND priority = ?";
      params.push(priority);
    }

    const group = sp.get("group");
    if (group) {
      sql += " AND group_name = ?";
      params.push(group);
    }

    const requestId = sp.get("requestId")?.trim();
    if (requestId) {
      sql += " AND CAST(request_id AS CHAR) LIKE ?";
      params.push(`%${requestId}%`);
    }

    const subject = sp.get("subject")?.trim();
    if (subject) {
      sql += " AND subject LIKE ?";
      params.push(`%${subject}%`);
    }

    const requester = sp.get("requester")?.trim();
    if (requester) {
      sql += " AND requester LIKE ?";
      params.push(`%${requester}%`);
    }

    const technician = sp.get("technician")?.trim();
    if (technician) {
      sql += " AND technician LIKE ?";
      params.push(`%${technician}%`);
    }

    const q = sp.get("q")?.trim();
    if (q) {
      sql += `
        AND (
          CAST(request_id AS CHAR) LIKE ?
          OR subject LIKE ?
          OR requester LIKE ?
          OR technician LIKE ?
        )
      `;

      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    sql += ` ORDER BY ${CREATED_DATE_SQL} DESC`;

    const rows = await query<ItsmRequest[]>(sql, params);

    const buffer = await buildItsmExport(rows);

    const filename = `itsm-export_${start}_${end}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /itsm-request/export failed", error);

    return NextResponse.json(
      {
        error: "Failed to export ITSM data.",
      },
      {
        status: 500,
      },
    );
  }
}