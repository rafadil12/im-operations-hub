import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { ItsmRequest } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    const start = sp.get("start");
    const end = sp.get("end");
    const status = sp.get("status");
    const priority = sp.get("priority");
    const group = sp.get("group");
    const q = sp.get("q");

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (start && end) {
      conditions.push(`
        STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p')
        BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
      `);

      params.push(start, end);
    }

    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }

    if (priority) {
      conditions.push("priority = ?");
      params.push(priority);
    }

    if (group) {
      conditions.push("group_name = ?");
      params.push(group);
    }

    if (q) {
      conditions.push(`
        (
          subject LIKE ?
          OR requester LIKE ?
          OR technician LIKE ?
        )
      `);

      const like = `%${q}%`;

      params.push(like, like, like);
    }

    const sql = `
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
      ${
        conditions.length
          ? `WHERE ${conditions.join(" AND ")}`
          : ""
      }
      ORDER BY
        STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p') DESC
    `;

    const rows = await query<ItsmRequest[]>(sql, params);

    return NextResponse.json({ rows });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to load ITSM requests.",
      },
      {
        status: 500,
      },
    );
  }
}