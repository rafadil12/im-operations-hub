import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    console.log("=== OVERVIEW ROUTE ===");

    const [
      total,
      open,
      progress,
      closedToday,
      overdue,
      topTechnicians,
      topRequesters,
      recentTickets,
      oldestTickets,
      serviceRequests

      
    ] = await Promise.all([
        
      // Total Tickets
      query<Record<string, unknown>[]>(`
        SELECT COUNT(*) AS total
        FROM itsm_requests
      `),

      // Open Tickets
      query<Record<string, unknown>[]>(`
        SELECT COUNT(*) AS total
        FROM itsm_requests
        WHERE status='已创建'
      `),

      // In Progress
      query<Record<string, unknown>[]>(`
        SELECT COUNT(*) AS total
        FROM itsm_requests
        WHERE status='处理中'
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

      // Top Technician
      query<Record<string, unknown>[]>(`
        SELECT
          technician,
          COUNT(*) AS totalTickets
        FROM itsm_requests
        WHERE technician IS NOT NULL
          AND technician <> ''
        GROUP BY technician
        ORDER BY totalTickets DESC
        LIMIT 5
      `),

      // Top Requester
      query<Record<string, unknown>[]>(`
        SELECT
          requester,
          COUNT(*) AS totalTickets
        FROM itsm_requests
        WHERE requester IS NOT NULL
          AND requester <> ''
        GROUP BY requester
        ORDER BY totalTickets DESC
        LIMIT 5
      `),

      // Recent Tickets
      query<Record<string, unknown>[]>(`
        SELECT
          request_id AS requestId,
          subject,
          requester,
          technician,
          status,
          created_date AS createdDate
        FROM itsm_requests
        ORDER BY
          STR_TO_DATE(created_date,'%d/%m/%Y %h:%i %p') DESC
        LIMIT 5
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
        LIMIT 5
      `),
      // Service Requests
        query<Record<string, unknown>[]>(`
        SELECT COUNT(*) AS total
        FROM itsm_requests
        WHERE is_service_request = 'true'
        `)
        ]);
console.log("Service Requests:", serviceRequests);
console.log("Service Requests Row:", serviceRequests[0]);
    return NextResponse.json({
      kpi: {
        totalTickets: Number(total[0]?.total ?? 0),
        openTickets: Number(open[0]?.total ?? 0),
        inProgressTickets: Number(progress[0]?.total ?? 0),
        closedToday: Number(closedToday[0]?.total ?? 0),
        overdueTickets: Number(overdue[0]?.total ?? 0),
        serviceRequests: Number(serviceRequests[0]?.total ?? 0),
      },

      highlights: {
        highestPriorityGroup: "-",
        busiestTechnician:
          topTechnicians[0]?.technician ?? "-",
        oldestOpenTicket:
          String(oldestTickets[0]?.requestId ?? "-"),
        averageResolutionTime: "-",
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