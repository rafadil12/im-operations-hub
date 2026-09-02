import { NextRequest, NextResponse } from "next/server";

import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth";

import {
  query,
  withTransaction,
} from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type EmployeeRow = {
  id: number;
  employee_no: string;
};

type PositionInfo = {
  id: number;
  name_en: string;
  division_id: number | null;
};

type ManagerRow = {
  id: number;
  name_en: string | null;
  employee_no: string;
};

function parseOptionalInt(
  value: unknown,
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isInteger(numberValue)
    ? numberValue
    : null;
}

function parseDate(
  value: unknown,
): string | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const valueString =
    String(value).trim();

  return valueString || null;
}

/* =========================================================
   AUTOMATIC ORGANIZATION MANAGER
=========================================================

   STRUCTURE:

   WANG CHUNLAI
   General Manager
   └── No Manager

   IT Staff
   └── Wang Chunlai

   MES Staff
   └── Wang Chunlai

   Intelligent Logistics Staff
   └── Wang Chunlai

   IT Technician
   └── IT Staff

   MES Technician
   └── MES Staff

   Intelligent Logistics Technician
   └── Intelligent Logistics Staff

   Manager TIDAK diambil dari manager_id frontend.
   Manager ditentukan berdasarkan position.
========================================================= */

async function resolveAutomaticManagerId(
  userId: number,
  positionId: number | null,
): Promise<number | null> {
  /*
   * Belum memilih position.
   */
  if (positionId === null) {
    return null;
  }

  /*
   * Ambil informasi position.
   */
  const positionRows =
    await query<PositionInfo[]>(
      `
      SELECT
        p.id,
        p.name_en,
        p.division_id
      FROM positions p
      WHERE p.id = ?
      LIMIT 1
      `,
      [positionId],
    );

  if (!positionRows.length) {
    throw new Error(
      "Selected position was not found.",
    );
  }

  const position =
    positionRows[0];

  const positionName =
    position.name_en
      .trim()
      .toLowerCase();

  /*
   * =======================================================
   * GENERAL MANAGER
   * =======================================================
   *
   * Wang Chunlai adalah root.
   *
   * Tidak mempunyai manager.
   */
  if (
    positionName ===
    "general manager"
  ) {
    return null;
  }

  /*
   * =======================================================
   * STAFF
   * =======================================================
   *
   * Semua Staff berada langsung
   * di bawah Wang Chunlai.
   */
  if (
    positionName.endsWith("staff")
  ) {
    const wangRows =
      await query<ManagerRow[]>(
        `
        SELECT
          u.id,
          u.name_en,
          u.employee_no
        FROM users u
        WHERE
          LOWER(
            TRIM(
              COALESCE(
                u.name_en,
                ''
              )
            )
          ) = 'wang chunlai'

          AND u.employee_no <> 'SUPERADMIN'

        LIMIT 1
        `,
      );

    if (!wangRows.length) {
      throw new Error(
        "Wang Chunlai was not found in users.",
      );
    }

    const wang =
      wangRows[0];

    /*
     * Wang tidak boleh menjadi
     * manager dirinya sendiri.
     */
    if (wang.id === userId) {
      return null;
    }

    return wang.id;
  }

  /*
   * =======================================================
   * TECHNICIAN
   * =======================================================
   *
   * Technician mencari Staff
   * pada department yang sama.
   *
   * IT Technician
   * → IT Staff
   *
   * MES Technician
   * → MES Staff
   *
   * Intelligent Logistics Technician
   * → Intelligent Logistics Staff
   */
  if (
    positionName.endsWith(
      "technician",
    )
  ) {
    const staffPositionName =
      position.name_en.replace(
        /technician$/i,
        "Staff",
      );

    const staffRows =
      await query<ManagerRow[]>(
        `
        SELECT
          u.id,
          u.name_en,
          u.employee_no

        FROM users u

        INNER JOIN employee_organization eo
          ON eo.user_id = u.id

        INNER JOIN positions p
          ON p.id = eo.position_id

        WHERE
          p.name_en = ?

          AND (
            p.division_id = ?
            OR u.division_id = ?
          )

          AND u.id <> ?

          AND u.employee_no <> 'SUPERADMIN'

        ORDER BY
          CASE
            WHEN eo.employment_status = 'Active'
              THEN 1
            ELSE 2
          END,

          u.id ASC

        LIMIT 1
        `,
        [
          staffPositionName,
          position.division_id,
          position.division_id,
          userId,
        ],
      );

    if (!staffRows.length) {
      throw new Error(
        `Manager "${staffPositionName}" was not found.`,
      );
    }

    return staffRows[0].id;
  }

  /*
   * Position lain:
   * tidak mempunyai automatic hierarchy.
   */
  return null;
}

/* =========================================================
   GET
   /api/organization/employees/[id]
========================================================= */

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const gate = await requirePermission(
    PERMISSIONS.organizationEmployeeRead,
  );

  if (gate instanceof NextResponse) {
    return gate;
  }

  try {
    const { id } =
      await context.params;

    const userId = Number(id);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Valid employee ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const rows =
      await query<EmployeeRow[]>(
        `
        SELECT
          u.id,
          u.employee_no
        FROM users u
        WHERE u.id = ?
        LIMIT 1
        `,
        [userId],
      );

    if (!rows.length) {
      return NextResponse.json(
        {
          error:
            "Employee not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      data: rows[0],
    });
  } catch (error) {
    console.error(
      "GET /api/organization/employees/[id] failed",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load employee.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PUT
   /api/organization/employees/[id]

   UPDATE employee organization data.
========================================================= */

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  const gate = await requirePermission(
    PERMISSIONS.organizationEmployeeUpdate,
  );

  if (gate instanceof NextResponse) {
    return gate;
  }

  try {
    const { id } =
      await context.params;

    const routeUserId =
      Number(id);

    if (
      !Number.isInteger(
        routeUserId,
      ) ||
      routeUserId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Valid employee ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

    const userId =
      routeUserId;

    /*
     * -------------------------------------------------------
     * INPUT
     * -------------------------------------------------------
     */

    const positionId =
      parseOptionalInt(
        body.position_id,
      );

    /*
     * IMPORTANT:
     *
     * Jangan mengambil manager_id
     * dari body.manager_id.
     *
     * Manager ditentukan otomatis
     * berdasarkan Position.
     */
    const managerId =
      await resolveAutomaticManagerId(
        userId,
        positionId,
      );

    const employmentType =
      body.employment_type ||
      "Permanent";

    const employmentStatus =
      body.employment_status ||
      "Active";

    const joinDate =
      parseDate(
        body.join_date,
      );

    const workLocation =
      body.work_location
        ?.toString()
        .trim() || null;

    const teamName =
      body.team_name
        ?.toString()
        .trim() || null;

    /*
     * -------------------------------------------------------
     * VALIDATE USER
     * -------------------------------------------------------
     */

    const users =
      await query<EmployeeRow[]>(
        `
        SELECT
          id,
          employee_no
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [userId],
      );

    if (!users.length) {
      return NextResponse.json(
        {
          error:
            "Employee not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * SUPERADMIN tidak boleh menjadi
     * employee organization.
     */

    if (
      users[0].employee_no ===
      "SUPERADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "SUPERADMIN is not an employee.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * SELF MANAGER CHECK
     */

    if (
      managerId === userId
    ) {
      return NextResponse.json(
        {
          error:
            "Employee cannot be their own manager.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * -------------------------------------------------------
     * VALIDATE MANAGER
     * -------------------------------------------------------
     */

    if (
      managerId !== null
    ) {
      const managers =
        await query<ManagerRow[]>(
          `
          SELECT
            id,
            name_en,
            employee_no
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [managerId],
        );

      if (!managers.length) {
        return NextResponse.json(
          {
            error:
              "Automatic manager was not found.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        managers[0].employee_no ===
        "SUPERADMIN"
      ) {
        return NextResponse.json(
          {
            error:
              "SUPERADMIN cannot be an organization manager.",
          },
          {
            status: 400,
          },
        );
      }
    }

    /*
     * -------------------------------------------------------
     * CHECK ORGANIZATION RECORD
     * -------------------------------------------------------
     */

    const existing =
      await query<
        {
          id: number;
        }[]
      >(
        `
        SELECT
          id
        FROM employee_organization
        WHERE user_id = ?
        LIMIT 1
        `,
        [userId],
      );

    /*
     * -------------------------------------------------------
     * UPDATE EXISTING
     * -------------------------------------------------------
     */

    if (existing.length) {
      await withTransaction(
        async (conn) => {
          await conn.execute(
            `
            UPDATE employee_organization

            SET
              position_id = ?,
              manager_id = ?,
              employment_type = ?,
              employment_status = ?,
              join_date = ?,
              work_location = ?,
              team_name = ?

            WHERE user_id = ?
            `,
            [
              positionId,
              managerId,
              employmentType,
              employmentStatus,
              joinDate,
              workLocation,
              teamName,
              userId,
            ],
          );
        },
      );

      return NextResponse.json({
        ok: true,
        action: "updated",
        user_id: userId,
        manager_id: managerId,
      });
    }

    /*
     * -------------------------------------------------------
     * CREATE IF NOT EXISTS
     * -------------------------------------------------------
     */

    const result =
      await withTransaction(
        async (conn) => {
          const [
            insertResult,
          ] = await conn.execute(
            `
            INSERT INTO employee_organization (
              user_id,
              position_id,
              manager_id,
              employment_type,
              employment_status,
              join_date,
              work_location,
              team_name
            )

            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
            )
            `,
            [
              userId,
              positionId,
              managerId,
              employmentType,
              employmentStatus,
              joinDate,
              workLocation,
              teamName,
            ],
          );

          return insertResult;
        },
      );

    return NextResponse.json(
      {
        ok: true,
        action: "created",
        user_id: userId,
        manager_id: managerId,
        id:
          "insertId" in result
            ? result.insertId
            : null,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "PUT /api/organization/employees/[id] failed",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update employee organization data.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PATCH
   /api/organization/employees/[id]

   Deactivate / change status.
========================================================= */

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const gate = await requirePermission(
    PERMISSIONS.organizationEmployeeUpdate,
  );

  if (gate instanceof NextResponse) {
    return gate;
  }

  try {
    const { id } =
      await context.params;

    const userId = Number(id);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Valid employee ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

    const employmentStatus =
      body.employment_status
        ?.toString()
        .trim();

    if (
      !employmentStatus
    ) {
      return NextResponse.json(
        {
          error:
            "employment_status is required.",
        },
        {
          status: 400,
        },
      );
    }

    const allowedStatuses = [
      "Active",
      "On Leave",
      "Inactive",
      "Resigned",
      "Terminated",
    ];

    if (
      !allowedStatuses.includes(
        employmentStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid employment status.",
        },
        {
          status: 400,
        },
      );
    }

    const existing =
      await query<
        {
          id: number;
        }[]
      >(
        `
        SELECT
          id
        FROM employee_organization
        WHERE user_id = ?
        LIMIT 1
        `,
        [userId],
      );

    if (!existing.length) {
      return NextResponse.json(
        {
          error:
            "Employee organization data not found.",
        },
        {
          status: 404,
        },
      );
    }

    await withTransaction(
      async (conn) => {
        await conn.execute(
          `
          UPDATE employee_organization

          SET
            employment_status = ?

          WHERE user_id = ?
          `,
          [
            employmentStatus,
            userId,
          ],
        );
      },
    );

    return NextResponse.json({
      ok: true,
      user_id: userId,
      employment_status:
        employmentStatus,
    });
  } catch (error) {
    console.error(
      "PATCH /api/organization/employees/[id] failed",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update employee status.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   DELETE
   /api/organization/employees/[id]
========================================================= */

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  const gate = await requirePermission(
    PERMISSIONS.organizationEmployeeDelete,
  );

  if (gate instanceof NextResponse) {
    return gate;
  }

  try {
    const { id } =
      await context.params;

    const userId = Number(id);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Valid employee ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const existing =
      await query<
        {
          id: number;
        }[]
      >(
        `
        SELECT
          id
        FROM employee_organization
        WHERE user_id = ?
        LIMIT 1
        `,
        [userId],
      );

    if (!existing.length) {
      return NextResponse.json(
        {
          error:
            "Employee organization data not found.",
        },
        {
          status: 404,
        },
      );
    }

    await withTransaction(
      async (conn) => {
        await conn.execute(
          `
          DELETE FROM employee_organization
          WHERE user_id = ?
          `,
          [userId],
        );
      },
    );

    return NextResponse.json({
      ok: true,
      user_id: userId,
      deleted: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/organization/employees/[id] failed",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete employee organization data.",
      },
      {
        status: 500,
      },
    );
  }
}