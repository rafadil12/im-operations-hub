import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { formatDateOnly } from "@/lib/dateRange";
import { query } from "@/lib/db";
import { isServiceRequestValue } from "@/lib/itsm/serviceRequest";

type TotalRow = {
  total: number;
};

type StatusRow = {
  status: string | null;
  count: number;
};

type GroupRow = {
  group_name: string | null;
  count: number;
};

type TechnicianRow = {
  technician: string | null;
  count: number;
};

type RequesterRow = {
  requester: string | null;
  count: number;
};

type PriorityRow = {
  priority: string | null;
  count: number;
};

type TrendRow = {
  date: string;
  count: number;
};

type RequestTypeRow = {
  is_service_request: string | null;
  count: number;
};

type ActiveUsersRow = {
  active_users: number;
};

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.itsmAnalysisView);
  if (gate instanceof NextResponse) return gate;

  try {
    const sp = request.nextUrl.searchParams;

    const start = sp.get("start");
    const end = sp.get("end");
    const group = sp.get("group");

    if (!start || !end) {
      return NextResponse.json({ error: "Start date and end date are required." }, { status: 400 });
    }
    const createdDateSql = `
      STR_TO_DATE(created_date, '%d/%m/%Y %h:%i %p')
    `;

    let filter = `
      ${createdDateSql} >= ?
      AND ${createdDateSql} < DATE_ADD(?, INTERVAL 1 DAY)
    `;

    const params: unknown[] = [start, end];

    if (group && group !== "All") {
      filter += ` AND group_name = ?`;
      params.push(group);
    }

    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);

    const diffDays =
      Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const groupByMonth = diffDays > 90;

    const days = Math.max(1, diffDays);
    const previousStart = new Date(startDate);
    previousStart.setDate(previousStart.getDate() - diffDays);

    const previousEnd = new Date(endDate);
    previousEnd.setDate(previousEnd.getDate() - diffDays);

    const previousParams: unknown[] = [formatDateOnly(previousStart), formatDateOnly(previousEnd)];

    if (group && group !== "All") {
      previousParams.push(group);
    }

    const [
      totalRows,
      statusRows,
      groupRows,
      technicianRows,
      requesterRows,
      priorityRows,
      trendRows,
      previousTrendRows,
      requestTypeRows,
      activeUsersRows,
    ] = await Promise.all([
      // 1. TOTAL TICKETS
      query<TotalRow[]>(
        `
        SELECT COUNT(*) AS total
        FROM itsm_requests
        WHERE ${filter}
        `,
        params
      ),

      // 2. STATUS DISTRIBUTION
      query<StatusRow[]>(
        `
        SELECT
          status,
          COUNT(*) AS count
        FROM itsm_requests
        WHERE ${filter}
        GROUP BY status
        ORDER BY count DESC
        `,
        params
      ),

      // 3. GROUP DISTRIBUTION
      query<GroupRow[]>(
        `
        SELECT
          group_name,
          COUNT(*) AS count
        FROM itsm_requests
        WHERE ${filter}
          AND group_name IS NOT NULL
          AND TRIM(group_name) <> ''
          AND TRIM(group_name) <> '-'
        GROUP BY group_name
        ORDER BY count DESC
        `,
        params
      ),

      // 4. TECHNICIAN RANKING
      query<TechnicianRow[]>(
        `
        SELECT
          technician,
          COUNT(*) AS count
        FROM itsm_requests
        WHERE ${filter}
          AND technician IS NOT NULL
          AND TRIM(technician) <> ''
          AND TRIM(technician) <> '-'
        GROUP BY technician
        ORDER BY count DESC
        LIMIT 10
        `,
        params
      ),
      // 5. REQUESTER RANKING
      query<RequesterRow[]>(
        `
        SELECT
          requester,
          COUNT(*) AS count
        FROM itsm_requests
        WHERE ${filter}
          AND requester IS NOT NULL
          AND TRIM(requester) <> ''
          AND TRIM(requester) <> '-'
        GROUP BY requester
        ORDER BY count DESC
        `,
        params
      ),

      // 5. PRIORITY DISTRIBUTION
      query<PriorityRow[]>(
        `
        SELECT
          priority,
          COUNT(*) AS count
        FROM itsm_requests
        WHERE ${filter}
          AND priority IS NOT NULL
          AND TRIM(priority) <> ''
        GROUP BY priority
        ORDER BY count DESC
        `,
        params
      ),

      // 6. TICKET TREND
      query<TrendRow[]>(
        groupByMonth
          ? `
          SELECT
            DATE_FORMAT(${createdDateSql}, '%Y-%m') AS date,
            COUNT(*) AS count
          FROM itsm_requests
          WHERE ${filter}
          GROUP BY DATE_FORMAT(${createdDateSql}, '%Y-%m')
          ORDER BY date ASC
        `
          : `
          SELECT
            DATE(${createdDateSql}) AS date,
            COUNT(*) AS count
          FROM itsm_requests
          WHERE ${filter}
          GROUP BY DATE(${createdDateSql})
          ORDER BY date ASC
        `,
        params
      ),
      query<TrendRow[]>(
        groupByMonth
          ? `
          SELECT
            DATE_FORMAT(${createdDateSql}, '%Y-%m') AS date,
            COUNT(*) AS count
          FROM itsm_requests
          WHERE
            ${createdDateSql} >= ?
            AND ${createdDateSql} < DATE_ADD(?, INTERVAL 1 DAY)
            ${group && group !== "All" ? "AND group_name = ?" : ""}
          GROUP BY DATE_FORMAT(${createdDateSql}, '%Y-%m')
          ORDER BY date ASC
        `
          : `
          SELECT
            DATE(${createdDateSql}) AS date,
            COUNT(*) AS count
          FROM itsm_requests
          WHERE
            ${createdDateSql} >= ?
            AND ${createdDateSql} < DATE_ADD(?, INTERVAL 1 DAY)
            ${group && group !== "All" ? "AND group_name = ?" : ""}
          GROUP BY DATE(${createdDateSql})
          ORDER BY date ASC
        `,
        previousParams
      ),

      // 7. INCIDENT / SERVICE REQUEST
      query<RequestTypeRow[]>(
        `
        SELECT
          is_service_request,
          COUNT(*) AS count
        FROM itsm_requests
        WHERE ${filter}
        GROUP BY is_service_request
        `,
        params
      ),
      // 8. ACTIVE USERS
      query<ActiveUsersRow[]>(
        `
        SELECT
          COUNT(DISTINCT requester) AS active_users
        FROM itsm_requests
        WHERE ${filter}
          AND requester IS NOT NULL
          AND TRIM(requester) <> ''
          AND TRIM(requester) <> '-'
        `,
        params
      ),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);

    const toNamedCount = (raw: string | null) => {
      const name = raw?.trim() || "Unknown";
      return { name_en: name, name_cn: name };
    };

    const byStatus = statusRows.map((row) => ({
      ...toNamedCount(row.status),
      count: Number(row.count),
    }));
    const activeUsers = Number(activeUsersRows[0]?.active_users ?? 0);

    const statusLabel = (item: { name_en: string | null; name_cn: string | null }) =>
      (item.name_en ?? item.name_cn ?? "").trim();

    const closedTickets = byStatus
      .filter((item) => {
        const name = statusLabel(item);
        return (
          name === "已关闭" ||
          name === "已解决" ||
          name.toLowerCase() === "closed" ||
          name.toLowerCase() === "resolved"
        );
      })
      .reduce((sum, item) => sum + item.count, 0);

    const cancelledTickets = byStatus
      .filter((item) => {
        const name = statusLabel(item);
        return (
          name === "已取消" ||
          name.toLowerCase() === "cancelled" ||
          name.toLowerCase() === "canceled"
        );
      })
      .reduce((sum, item) => sum + item.count, 0);

    const openTickets = Math.max(0, total - closedTickets - cancelledTickets);

    const byGroup = groupRows.map((row) => ({
      ...toNamedCount(row.group_name),
      count: Number(row.count),
    }));

    const technicianRanking = technicianRows.map((row) => ({
      name: row.technician ?? "Unknown",
      count: Number(row.count),
    }));

    const requesterRanking = requesterRows.map((row) => ({
      name: row.requester ?? "Unknown",
      count: Number(row.count),
    }));

    const byPriority = priorityRows.map((row) => ({
      ...toNamedCount(row.priority),
      count: Number(row.count),
    }));

    const trend = trendRows.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));
    const previousTrend = previousTrendRows.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));

    const byRequestType = requestTypeRows.map((row) => ({
      name_en: isServiceRequestValue(row.is_service_request) ? "Service Request" : "Incident",
      name_cn: isServiceRequestValue(row.is_service_request) ? "服务请求" : "事件",
      count: Number(row.count),
    }));
    /*
     * Average ticket per day
     */
    const avgTicketsPerDay = Math.round((total / days) * 10) / 10;

    return NextResponse.json({
      result: {
        total,
        openTickets,
        closedTickets,
        activeUsers,
        avgTicketsPerDay,

        byStatus,
        byGroup,
        technicianRanking,
        requesterRanking,
        byPriority,
        trend: {
          current: trend,
          previous: previousTrend,
        },
        byRequestType,
      },

      range: {
        start,
        end,
      },
    });
  } catch (error) {
    console.error("GET /api/itsm/analysis failed:", error);

    return NextResponse.json(
      {
        error: "Failed to load ITSM analysis.",
      },
      {
        status: 500,
      }
    );
  }
}
