import { NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { IS_SERVICE_REQUEST_SQL } from "@/lib/itsm/serviceRequest";

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.itsmOverviewView);
  if (gate instanceof NextResponse) return gate;

  try {
    const [kpiRows, topGroups, topTechnicians, topRequesters, recentTickets, oldestTickets] =
      await Promise.all([
        query<Record<string, unknown>[]>(`
          SELECT
            COUNT(*) AS totalTickets,
            SUM(
              CASE
                WHEN created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                 AND created_at < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
                THEN 1 ELSE 0
              END
            ) AS currentMonthTickets,
            SUM(
              CASE
                WHEN created_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
                 AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')
                THEN 1 ELSE 0
              END
            ) AS previousMonthTickets,
            SUM(
              CASE
                WHEN ${IS_SERVICE_REQUEST_SQL}
                 AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                 AND created_at < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
                THEN 1 ELSE 0
              END
            ) AS currentServiceMonth,
            SUM(
              CASE
                WHEN ${IS_SERVICE_REQUEST_SQL}
                 AND created_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
                 AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')
                THEN 1 ELSE 0
              END
            ) AS previousServiceMonth,
            SUM(CASE WHEN status NOT IN ('已关闭','已解决') THEN 1 ELSE 0 END) AS openTickets,
            SUM(CASE WHEN status = '处理中' THEN 1 ELSE 0 END) AS inProgressTickets,
            SUM(CASE WHEN ${IS_SERVICE_REQUEST_SQL} THEN 1 ELSE 0 END) AS serviceRequests,
            SUM(CASE WHEN NOT (${IS_SERVICE_REQUEST_SQL}) THEN 1 ELSE 0 END) AS incidentCount,
            SUM(
              CASE
                WHEN status IN ('已关闭','已解决')
                 AND DATE(created_at) = CURDATE()
                THEN 1 ELSE 0
              END
            ) AS closedToday,
            SUM(
              CASE
                WHEN due_at < NOW()
                 AND status NOT IN ('已关闭','已解决')
                THEN 1 ELSE 0
              END
            ) AS overdueTickets
          FROM itsm_requests
        `),
        query<Record<string, unknown>[]>(`
          SELECT
            group_name AS name,
            COUNT(*) AS count
          FROM itsm_requests
          WHERE group_name IS NOT NULL
            AND group_name <> ''
          GROUP BY group_name
          ORDER BY count DESC
          LIMIT 1
        `),
        query<Record<string, unknown>[]>(`
          SELECT
            technician,
            COUNT(*) AS totalTickets
          FROM itsm_requests
          WHERE technician IS NOT NULL
            AND technician <> ''
            AND technician <> '-'
          GROUP BY technician
          ORDER BY totalTickets DESC
          LIMIT 5
        `),
        query<Record<string, unknown>[]>(`
          SELECT
            requester,
            COUNT(*) AS totalTickets
          FROM itsm_requests
          WHERE requester IS NOT NULL
            AND requester <> ''
            AND requester <> 'NUSA IT Test001 '
          GROUP BY requester
          ORDER BY totalTickets DESC
          LIMIT 5
        `),
        query<Record<string, unknown>[]>(`
          SELECT
            request_id AS requestId,
            subject,
            technician,
            status
          FROM itsm_requests
          ORDER BY created_at DESC
          LIMIT 10
        `),
        query<Record<string, unknown>[]>(`
          SELECT
            request_id AS requestId,
            subject,
            technician,
            DATEDIFF(NOW(), created_at) AS daysOpen
          FROM itsm_requests
          WHERE status NOT IN ('已关闭','已解决')
          ORDER BY daysOpen DESC
          LIMIT 10
        `),
      ]);

    const kpi = kpiRows[0] ?? {};
    const totalTickets = Number(kpi.totalTickets ?? 0);
    const highestGroupTickets = Number(topGroups[0]?.count ?? 0);

    const highestGroupPercent =
      totalTickets > 0 ? Math.round((highestGroupTickets / totalTickets) * 100) : 0;

    const currentMonthTickets = Number(kpi.currentMonthTickets ?? 0);
    const previousMonthTickets = Number(kpi.previousMonthTickets ?? 0);
    const totalChange = currentMonthTickets - previousMonthTickets;

    const currentService = Number(kpi.currentServiceMonth ?? 0);
    const previousService = Number(kpi.previousServiceMonth ?? 0);
    const serviceChange = currentService - previousService;
    const topRequesterTickets = Number(topRequesters[0]?.totalTickets ?? 0);

    const topRequesterPercent =
      totalTickets > 0 ? Math.round((topRequesterTickets / totalTickets) * 100) : 0;

    const incidentCount = Number(kpi.incidentCount ?? 0);

    const incidentPercent = totalTickets > 0 ? Math.round((incidentCount / totalTickets) * 100) : 0;

    return NextResponse.json({
      kpi: {
        totalTickets,
        totalChange,

        openTickets: Number(kpi.openTickets ?? 0),

        inProgressTickets: Number(kpi.inProgressTickets ?? 0),

        serviceRequests: Number(kpi.serviceRequests ?? 0),
        serviceChange,

        closedToday: Number(kpi.closedToday ?? 0),

        overdueTickets: Number(kpi.overdueTickets ?? 0),

        slaCompliance: 98.5,
      },

      highlights: {
        highestPriorityGroup: topGroups[0]?.name ?? "-",

        highestPriorityGroupTickets: highestGroupTickets,
        highestPriorityGroupPercent: highestGroupPercent,

        busiestTechnician: topTechnicians[0]?.technician ?? "-",
        busiestTechnicianTickets: Number(topTechnicians[0]?.totalTickets ?? 0),
        busiestTechnicianPercent:
          totalTickets > 0
            ? Math.round((Number(topTechnicians[0]?.totalTickets ?? 0) / totalTickets) * 100)
            : 0,

        oldestOpenTicket: String(oldestTickets[0]?.requestId ?? "-"),
        oldestOpenDays: Number(oldestTickets[0]?.daysOpen ?? 0),
        topRequester: topRequesters[0]?.requester ?? "-",
        topRequesterTickets,
        topRequesterPercent,

        incidentCount,
        incidentPercent,
      },

      topTechnicians,
      topRequesters,
      recentTickets,
      oldestTickets,
    });
  } catch (error) {
    console.error("GET /api/itsm/overview failed:", error);

    return NextResponse.json(
      {
        error: "Failed to load ITSM overview.",
      },
      {
        status: 500,
      }
    );
  }
}
