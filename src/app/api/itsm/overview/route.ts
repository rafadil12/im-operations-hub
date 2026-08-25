import { NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { IS_SERVICE_REQUEST_SQL } from "@/lib/itsm/serviceRequest";

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.itsmOverviewView);
  if (gate instanceof NextResponse) return gate;

  try {
    const [
      total,
      currentMonth,
      previousMonth,
      currentServiceMonth,
      previousServiceMonth,
      open,
      progress,
      serviceRequests,
      incidents,
      closedToday,
      overdue,
      topGroups,
      topTechnicians,
      topRequesters,
      recentTickets,
      oldestTickets,
    ] = await Promise.all([
      // Total Tickets
      query<Record<string, unknown>[]>(`
        SELECT COUNT(*) AS total
        FROM itsm_requests
      `),
      // Current Month Tickets
      query<Record<string, unknown>[]>(`
        SELECT COUNT(*) AS total
        FROM itsm_requests
        WHERE STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p')
            >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
          AND STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p')
            < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
      `),

      // Previous Month Tickets
      query<Record<string, unknown>[]>(`
        SELECT COUNT(*) AS total
        FROM itsm_requests
        WHERE STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p')
            >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
          AND STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p')
            < DATE_FORMAT(CURDATE(), '%Y-%m-01')
      `),
      // Current Month Service Requests
      query<Record<string, unknown>[]>(`
          SELECT COUNT(*) AS total
          FROM itsm_requests
          WHERE ${IS_SERVICE_REQUEST_SQL}
            AND STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p')
                >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
            AND STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p')
                < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
        `),

      // Previous Month Service Requests
      query<Record<string, unknown>[]>(`
          SELECT COUNT(*) AS total
          FROM itsm_requests
          WHERE ${IS_SERVICE_REQUEST_SQL}
            AND STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p')
                >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
            AND STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p')
                < DATE_FORMAT(CURDATE(), '%Y-%m-01')
        `),

      // Open Tickets (belum selesai)
      query<Record<string, unknown>[]>(`
        SELECT COUNT(*) AS total
        FROM itsm_requests
        WHERE status NOT IN ('已关闭','已解决')
      `),
      // In Progress
      query<Record<string, unknown>[]>(`
        SELECT COUNT(*) AS total
        FROM itsm_requests
        WHERE status = '处理中'
      `),

      // Service Requests (menggantikan In Progress)
      query<Record<string, unknown>[]>(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN ${IS_SERVICE_REQUEST_SQL} THEN 1 ELSE 0 END) AS serviceRequests
        FROM itsm_requests
      `),
      // Incidents
      query<Record<string, unknown>[]>(`
        SELECT
          COUNT(*) AS total
        FROM itsm_requests
        WHERE NOT (${IS_SERVICE_REQUEST_SQL})
      `),

      // Closed Today
      query<Record<string, unknown>[]>(`
        SELECT COUNT(*) AS total
        FROM itsm_requests
        WHERE status IN ('已关闭','已解决')
          AND DATE(
            STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p')
          ) = CURDATE()
      `),

      // Overdue
      query<Record<string, unknown>[]>(`
        SELECT COUNT(*) AS total
        FROM itsm_requests
        WHERE STR_TO_DATE(due_by_date,'%d/%m/%Y %h:%i %p') < NOW()
          AND status NOT IN ('已关闭','已解决')
      `),

      // Most Active Group
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

      // Top Technician
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
      `),

      // Top Requester
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
      `),

      // Recent Tickets
      query<Record<string, unknown>[]>(`
        SELECT
          request_id AS requestId,
          subject,
          technician,
          status
        FROM itsm_requests
        ORDER BY
          STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p') DESC  
      `),

      // Oldest Open Tickets
      query<Record<string, unknown>[]>(`
        SELECT
          request_id AS requestId,
          subject,
          technician,
          DATEDIFF(
            NOW(),
            STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p')
          ) AS daysOpen
        FROM itsm_requests
        WHERE status NOT IN ('已关闭','已解决')
        ORDER BY daysOpen DESC
      `),
    ]);
    const totalTickets = Number(total[0]?.total ?? 0);
    const highestGroupTickets = Number(topGroups[0]?.count ?? 0);

    const highestGroupPercent =
      totalTickets > 0 ? Math.round((highestGroupTickets / totalTickets) * 100) : 0;

    // Total Ticket Change
    const currentMonthTickets = Number(currentMonth[0]?.total ?? 0);
    const previousMonthTickets = Number(previousMonth[0]?.total ?? 0);
    const totalChange = currentMonthTickets - previousMonthTickets;

    // Service Request Change
    const currentService = Number(currentServiceMonth[0]?.total ?? 0);
    const previousService = Number(previousServiceMonth[0]?.total ?? 0);
    const serviceChange = currentService - previousService;
    const topRequesterTickets = Number(topRequesters[0]?.totalTickets ?? 0);

    const topRequesterPercent =
      totalTickets > 0 ? Math.round((topRequesterTickets / totalTickets) * 100) : 0;

    const incidentCount = Number(incidents[0]?.total ?? 0);

    const incidentPercent = totalTickets > 0 ? Math.round((incidentCount / totalTickets) * 100) : 0;

    return NextResponse.json({
      kpi: {
        totalTickets,
        totalChange,

        openTickets: Number(open[0]?.total ?? 0),

        inProgressTickets: Number(progress[0]?.total ?? 0),

        serviceRequests: Number(serviceRequests[0]?.serviceRequests ?? 0),
        serviceChange,

        closedToday: Number(closedToday[0]?.total ?? 0),

        overdueTickets: Number(overdue[0]?.total ?? 0),

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
