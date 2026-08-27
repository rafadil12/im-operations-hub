import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";

export const dynamic = "force-dynamic";

type EmployeeResolveInput = {
  employeeOrganizationId?: number;
  employeeNo?: string;
};

async function resolveEmployeeOrganizationId(
  input: EmployeeResolveInput,
): Promise<number | null> {
  if (
    input.employeeOrganizationId !== undefined &&
    Number.isInteger(input.employeeOrganizationId)
  ) {
    const rows = await query<{ id: number }[]>(
      `
        SELECT id
        FROM employee_organization
        WHERE id = ?
        LIMIT 1
      `,
      [input.employeeOrganizationId],
    );

    return rows.length > 0 ? rows[0].id : null;
  }

  const employeeNo = input.employeeNo?.trim();

  if (!employeeNo) {
    return null;
  }

  const rows = await query<{ id: number }[]>(
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

/* =========================================================
   GET
   /api/organization/shift-management/off-days

   Examples:
   GET /api/.../off-days
   GET /api/.../off-days?employeeNo=62000779
   GET /api/.../off-days?employeeOrganizationId=12
========================================================= */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const employeeNo =
      searchParams.get("employeeNo")?.trim() || undefined;

    const employeeOrganizationIdParam =
      searchParams.get("employeeOrganizationId");

    const employeeOrganizationId =
      employeeOrganizationIdParam &&
      Number.isInteger(Number(employeeOrganizationIdParam))
        ? Number(employeeOrganizationIdParam)
        : undefined;

    if (employeeNo || employeeOrganizationId !== undefined) {
      const resolvedId = await resolveEmployeeOrganizationId({
        employeeOrganizationId,
        employeeNo,
      });

      if (!resolvedId) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      const rows = await query(
        `
          SELECT
            pod.id,
            pod.employee_organization_id,
            u.employee_no,
            u.name_en,
            u.name_cn,
            pod.off_date,
            pod.is_fixed,
            pod.created_by,
            pod.fixed_at,
            pod.created_at,
            pod.updated_at
          FROM personal_off_days pod
          INNER JOIN employee_organization eo
            ON eo.id = pod.employee_organization_id
          INNER JOIN users u
            ON u.id = eo.user_id
          WHERE pod.employee_organization_id = ?
          ORDER BY pod.off_date ASC
        `,
        [resolvedId],
      );

      return NextResponse.json({
        success: true,
        data: rows,
      });
    }

    const rows = await query(
      `
        SELECT
          pod.id,
          pod.employee_organization_id,
          u.employee_no,
          u.name_en,
          u.name_cn,
          pod.off_date,
          pod.is_fixed,
          pod.created_by,
          pod.fixed_at,
          pod.created_at,
          pod.updated_at
        FROM personal_off_days pod
        INNER JOIN employee_organization eo
          ON eo.id = pod.employee_organization_id
        INNER JOIN users u
          ON u.id = eo.user_id
        ORDER BY
          pod.off_date ASC,
          u.employee_no ASC
      `,
    );

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error(
      "GET /api/organization/shift-management/off-days failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load personal OFF days.",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   POST
   Save / Fix OFF days

   Body:
   {
     employeeNo: "62000779",
     dates: ["2026-08-28", "2026-08-30"],
     fixed: true,
     createdBy: 123
   }
========================================================= */

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      employeeOrganizationId?: number;
      employeeNo?: string;
      dates?: string[];
      fixed?: boolean;
      createdBy?: number | null;
    };

    if (!Array.isArray(body.dates) || body.dates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "dates must be a non-empty array.",
        },
        { status: 400 },
      );
    }

    const employeeOrganizationId =
      await resolveEmployeeOrganizationId({
        employeeOrganizationId: body.employeeOrganizationId,
        employeeNo: body.employeeNo,
      });

    if (!employeeOrganizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Employee could not be resolved.",
        },
        { status: 404 },
      );
    }

    const isFixed = body.fixed !== false;

    for (const date of body.dates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid date format: ${date}`,
          },
          { status: 400 },
        );
      }
    }

    await withTransaction(async (connection) => {
      for (const date of body.dates!) {
        await connection.query(
          `
            INSERT INTO personal_off_days (
              employee_organization_id,
              off_date,
              is_fixed,
              created_by,
              fixed_at
            )
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              is_fixed = VALUES(is_fixed),
              created_by = VALUES(created_by),
              fixed_at = VALUES(fixed_at),
              updated_at = CURRENT_TIMESTAMP
          `,
          [
            employeeOrganizationId,
            date,
            isFixed ? 1 : 0,
            body.createdBy ?? null,
            isFixed ? new Date() : null,
          ],
        );
      }
    });

    const rows = await query(
      `
        SELECT
          pod.id,
          pod.employee_organization_id,
          u.employee_no,
          u.name_en,
          u.name_cn,
          pod.off_date,
          pod.is_fixed,
          pod.created_by,
          pod.fixed_at,
          pod.created_at,
          pod.updated_at
        FROM personal_off_days pod
        INNER JOIN employee_organization eo
          ON eo.id = pod.employee_organization_id
        INNER JOIN users u
          ON u.id = eo.user_id
        WHERE pod.employee_organization_id = ?
        ORDER BY pod.off_date ASC
      `,
      [employeeOrganizationId],
    );

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error(
      "POST /api/organization/shift-management/off-days failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save personal OFF days.",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   DELETE
   Hanya menghapus OFF yang belum fixed.
========================================================= */

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      employeeOrganizationId?: number;
      employeeNo?: string;
      dates?: string[];
      date?: string;
    };

    const dates = body.dates ?? (body.date ? [body.date] : []);

    if (dates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "date or dates is required.",
        },
        { status: 400 },
      );
    }

    const employeeOrganizationId =
      await resolveEmployeeOrganizationId({
        employeeOrganizationId: body.employeeOrganizationId,
        employeeNo: body.employeeNo,
      });

    if (!employeeOrganizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Employee could not be resolved.",
        },
        { status: 404 },
      );
    }

    for (const date of dates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid date format: ${date}`,
          },
          { status: 400 },
        );
      }
    }

    for (const date of dates) {
      await query(
        `
          DELETE FROM personal_off_days
          WHERE employee_organization_id = ?
            AND off_date = ?
            AND is_fixed = 0
        `,
        [employeeOrganizationId, date],
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/organization/shift-management/off-days failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete personal OFF days.",
      },
      { status: 500 },
    );
  }
}