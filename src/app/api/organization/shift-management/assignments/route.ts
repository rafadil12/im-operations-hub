import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";

export const dynamic = "force-dynamic";

type ShiftCode = "D/S" | "N/S";

type AssignmentRow = {
  id: number;
  employee_organization_id: number;
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  shift_code: ShiftCode;
  is_excluded: number;
};

async function resolveEmployeeOrganizationId(
  employeeNo: string,
): Promise<number | null> {
  const rows = await query<
    Array<{
      id: number;
    }>
  >(
    `
      SELECT eo.id
      FROM employee_organization eo
      INNER JOIN users u
        ON u.id = eo.user_id
      WHERE u.employee_no = ?
      LIMIT 1
    `,
    [employeeNo],
  );

  return rows.length > 0 ? rows[0].id : null;
}

export async function GET() {
  try {
    const rows = await query<AssignmentRow[]>(
      `
        SELECT
          sa.id,
          sa.employee_organization_id,
          u.employee_no,
          u.name_en,
          u.name_cn,
          sa.shift_code,
          sa.is_excluded
        FROM shift_assignments sa
        INNER JOIN employee_organization eo
          ON eo.id = sa.employee_organization_id
        INNER JOIN users u
          ON u.id = eo.user_id
        ORDER BY u.employee_no ASC
      `,
    );

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET shift assignments failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load shift assignments.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const employeeNo = String(body.employeeNo ?? "").trim();
    const shift = String(body.shift ?? "") as ShiftCode;
    const excluded = Boolean(body.excluded);

    if (!employeeNo) {
      return NextResponse.json(
        {
          success: false,
          error: "employeeNo is required.",
        },
        { status: 400 },
      );
    }

    if (shift !== "D/S" && shift !== "N/S") {
      return NextResponse.json(
        {
          success: false,
          error: "shift must be D/S or N/S.",
        },
        { status: 400 },
      );
    }

    const employeeOrganizationId =
      await resolveEmployeeOrganizationId(employeeNo);

    if (!employeeOrganizationId) {
      return NextResponse.json(
        {
          success: false,
          error: `Employee ${employeeNo} was not found.`,
        },
        { status: 404 },
      );
    }

    await execute(
      `
        INSERT INTO shift_assignments (
          employee_organization_id,
          shift_code,
          is_excluded
        )
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          shift_code = VALUES(shift_code),
          is_excluded = VALUES(is_excluded),
          updated_at = CURRENT_TIMESTAMP
      `,
      [employeeOrganizationId, shift, excluded ? 1 : 0],
    );

    const rows = await query<AssignmentRow[]>(
      `
        SELECT
          sa.id,
          sa.employee_organization_id,
          u.employee_no,
          u.name_en,
          u.name_cn,
          sa.shift_code,
          sa.is_excluded
        FROM shift_assignments sa
        INNER JOIN employee_organization eo
          ON eo.id = sa.employee_organization_id
        INNER JOIN users u
          ON u.id = eo.user_id
        WHERE sa.employee_organization_id = ?
        LIMIT 1
      `,
      [employeeOrganizationId],
    );

    return NextResponse.json({
      success: true,
      data: rows[0] ?? null,
    });
  } catch (error) {
    console.error("POST shift assignment failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save shift assignment.",
      },
      { status: 500 },
    );
  }
}