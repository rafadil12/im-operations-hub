import { NextRequest, NextResponse } from "next/server";

import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth";

import { query } from "@/lib/db";

type PositionRow = {
  id: number;
  name_en: string;
  name_cn: string | null;
  division_id: number | null;
  division_name_en: string | null;
  division_name_cn: string | null;
};

export async function GET(
  _request: NextRequest,
) {
  const gate = await requirePermission(
    PERMISSIONS.organizationEmployeeRead,
  );

  if (gate instanceof NextResponse) {
    return gate;
  }

  try {
    const rows =
      await query<PositionRow[]>(
        `
        SELECT
          p.id,
          p.name_en,
          p.name_cn,
          p.division_id,

          d.name_en AS division_name_en,
          d.name_cn AS division_name_cn

        FROM positions p

        LEFT JOIN divisions d
          ON d.id = p.division_id

        WHERE p.name_en IN (
          'General Manager',

          'IT Staff',
          'IT Technician',

          'MES Staff',
          'MES Technician',

          'Intelligent Logistics Staff',
          'Intelligent Logistics Technician'
        )

        ORDER BY
          CASE

            WHEN p.name_en = 'General Manager'
              THEN 1

            WHEN d.name_en = 'IT'
              AND p.name_en = 'IT Staff'
              THEN 2

            WHEN d.name_en = 'IT'
              AND p.name_en = 'IT Technician'
              THEN 3

            WHEN d.name_en = 'MES'
              AND p.name_en = 'MES Staff'
              THEN 4

            WHEN d.name_en = 'MES'
              AND p.name_en = 'MES Technician'
              THEN 5

            WHEN d.name_en = 'Intelligent Logistics'
              AND p.name_en = 'Intelligent Logistics Staff'
              THEN 6

            WHEN d.name_en = 'Intelligent Logistics'
              AND p.name_en = 'Intelligent Logistics Technician'
              THEN 7

            ELSE 99

          END,

          p.name_en ASC
        `,
      );

    return NextResponse.json({
      data: rows,
    });
  } catch (error) {
    console.error(
      "GET /api/organization/positions failed",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load positions.",
      },
      {
        status: 500,
      },
    );
  }
}
