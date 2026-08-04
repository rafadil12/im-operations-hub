import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type TotalRow = {
  total: number;
};

type StatusRow = {
  status: string | null;
  total: number;
};

type GroupRow = {
  group_name: string | null;
  total: number;
};

type TechnicianRow = {
  technician: string | null;
  total: number;
};

export async function GET() {
  try {
    const [
      totalRows,
      statusRows,
      groupRows,
      technicianRows,
    ] = await Promise.all([
      // =========================
      // TOTAL TICKET
      // =========================
      query<TotalRow[]>(`
        SELECT COUNT(*) AS total
        FROM itsm_requests
      `),

      // =========================
      // TICKET BY STATUS
      // =========================
      query<StatusRow[]>(`
        SELECT
          status,
          COUNT(*) AS total
        FROM itsm_requests
        GROUP BY status
        ORDER BY total DESC
      `),

      // =========================
      // TICKET BY GROUP
      // =========================
      query<GroupRow[]>(`
        SELECT
          group_name,
          COUNT(*) AS total
        FROM itsm_requests
        WHERE group_name IS NOT NULL
          AND group_name <> ''
          AND group_name <> '-'
        GROUP BY group_name
        ORDER BY total DESC
      `),

      // =========================
      // TOP TECHNICIAN
      // =========================
      query<TechnicianRow[]>(`
        SELECT
          technician,
          COUNT(*) AS total
        FROM itsm_requests
        WHERE technician IS NOT NULL
          AND technician <> ''
        GROUP BY technician
        ORDER BY total DESC
        LIMIT 4
      `),
    ]);

    const totalTickets = Number(totalRows[0]?.total ?? 0);

    const statuses = statusRows.map((row) => ({
      status: row.status ?? "Unknown",
      count: Number(row.total),
    }));

    const groups = groupRows.map((row) => ({
      name: row.group_name ?? "Unknown",
      count: Number(row.total),
    }));

    const technicians = technicianRows.map((row) => ({
      name: row.technician ?? "Unknown",
      count: Number(row.total),
    }));

    return NextResponse.json({
      result: {
        totalTickets,
        statuses,
        groups,
        technicians,
      },
    });
  } catch (error) {
    console.error("GET /api/itsm/overview failed:", error);

    return NextResponse.json(
      {
        error: "Failed to load ITSM overview.",
      },
      {
        status: 500,
      },
    );
  }
}