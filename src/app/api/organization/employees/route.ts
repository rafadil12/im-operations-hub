import { NextRequest, NextResponse } from "next/server";

import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth";

import {
  query,
  withTransaction,
} from "@/lib/db";

type EmployeeRow = {
  id: number;
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;

  division_id: number | null;
  division_name_en: string | null;
  division_name_cn: string | null;

  position_id: number | null;
  position_name_en: string | null;
  position_name_cn: string | null;

  manager_id: number | null;
  manager_name_en: string | null;
  manager_name_cn: string | null;

  employment_type:
    | "Permanent"
    | "Contract"
    | "Probation"
    | "Intern"
    | "Outsource"
    | null;

  employment_status:
    | "Active"
    | "On Leave"
    | "Inactive"
    | "Resigned"
    | "Terminated"
    | null;

  join_date: string | null;
  work_location: string | null;
  team_name: string | null;
};

type CountRow = {
  total: number;
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

function parseOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

/* =========================================================
   GET
   /api/organization/employees

   Ambil semua employee organization.
========================================================= */

export async function GET(
  request: NextRequest,
) {
  const gate = await requirePermission(
    PERMISSIONS.dailyMasterManage,
  );

  if (gate instanceof NextResponse) {
    return gate;
  }

  try {
    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    const departmentId =
      parseOptionalInt(
        searchParams.get(
          "division_id",
        ),
      );

    const positionId =
      parseOptionalInt(
        searchParams.get(
          "position_id",
        ),
      );

    const status =
      searchParams
        .get("status")
        ?.trim() || "";

    const employmentType =
      searchParams
        .get("employment_type")
        ?.trim() || "";

    const page = Math.max(
      1,
      Number(
        searchParams.get("page") ||
          1,
      ),
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(
          searchParams.get("limit") ||
            20,
        ),
      ),
    );

    const offset =
      (page - 1) * limit;

    const conditions: string[] = [
      "u.employee_no IS NOT NULL",
      "u.employee_no <> 'SUPERADMIN'",
    ];

    const params: unknown[] = [];

    /* -------------------------------------------------------
       SEARCH
    ------------------------------------------------------- */

    if (search) {
      conditions.push(`
        (
          u.employee_no LIKE ?
          OR u.name_en LIKE ?
          OR u.name_cn LIKE ?
        )
      `);

      const keyword = `%${search}%`;

      params.push(
        keyword,
        keyword,
        keyword,
      );
    }

    /* -------------------------------------------------------
       DEPARTMENT FILTER
    ------------------------------------------------------- */

    if (departmentId !== null) {
      conditions.push(
        "u.division_id = ?",
      );

      params.push(departmentId);
    }

    /* -------------------------------------------------------
       POSITION FILTER
    ------------------------------------------------------- */

    if (positionId !== null) {
      conditions.push(
        "eo.position_id = ?",
      );

      params.push(positionId);
    }

    /* -------------------------------------------------------
       STATUS FILTER
    ------------------------------------------------------- */

    if (status) {
      conditions.push(
        "eo.employment_status = ?",
      );

      params.push(status);
    }

    /* -------------------------------------------------------
       EMPLOYMENT TYPE FILTER
    ------------------------------------------------------- */

    if (employmentType) {
      conditions.push(
        "eo.employment_type = ?",
      );

      params.push(employmentType);
    }

    const whereClause =
      conditions.join("\nAND ");

    /* -------------------------------------------------------
       COUNT
    ------------------------------------------------------- */

    const countRows =
      await query<CountRow[]>(
        `
        SELECT
          COUNT(*) AS total

        FROM users u

        LEFT JOIN employee_organization eo
          ON eo.user_id = u.id

        WHERE ${whereClause}
        `,
        params,
      );

    const total = Number(
      countRows[0]?.total ?? 0,
    );

    /* -------------------------------------------------------
       EMPLOYEE DATA
    ------------------------------------------------------- */

    const rows =
      await query<EmployeeRow[]>(
        `
        SELECT

          u.id,

          u.employee_no,

          u.name_en,

          u.name_cn,

          u.division_id,

          d.name_en
            AS division_name_en,

          d.name_cn
            AS division_name_cn,

          eo.position_id,

          p.name_en
            AS position_name_en,

          p.name_cn
            AS position_name_cn,

          eo.manager_id,

          manager.name_en
            AS manager_name_en,

          manager.name_cn
            AS manager_name_cn,

          eo.employment_type,

          eo.employment_status,

          eo.join_date,

          eo.work_location,

          eo.team_name

        FROM users u

        LEFT JOIN divisions d
          ON d.id = u.division_id

        LEFT JOIN employee_organization eo
          ON eo.user_id = u.id

        LEFT JOIN positions p
          ON p.id = eo.position_id

        LEFT JOIN users manager
          ON manager.id = eo.manager_id

        WHERE ${whereClause}

        ORDER BY
          COALESCE(
            u.name_en,
            u.name_cn,
            u.employee_no
          ) ASC

        LIMIT ?

        OFFSET ?
        `,
        [
          ...params,
          limit,
          offset,
        ],
      );

    return NextResponse.json({
      data: rows,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit,
          ),
      },
    });
  } catch (error) {
    console.error(
      "GET /api/organization/employees failed",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load employees.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST
   /api/organization/employees

   Employee sudah berasal dari users.

   POST hanya membuat data:
   employee_organization

   Tidak membuat user baru.
========================================================= */

export async function POST(
  request: NextRequest,
) {
  const gate = await requirePermission(
    PERMISSIONS.dailyMasterManage,
  );

  if (gate instanceof NextResponse) {
    return gate;
  }

  try {
    const body = await request.json();

    const employeeId = parseOptionalText(body.employee_id);
    const name = parseOptionalText(body.name);
    const nameCn = parseOptionalText(body.name_cn);
    const department = parseOptionalText(body.department);

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required." },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Full Name is required." },
        { status: 400 },
      );
    }

    if (!department) {
      return NextResponse.json(
        { error: "Department is required." },
        { status: 400 },
      );
    }

    const positionId = parseOptionalInt(body.position_id);
    const managerId = parseOptionalInt(body.manager_id);
    const employmentType = body.employment_type || "Permanent";
    const employmentStatus = body.employment_status || "Active";
    const joinDate = parseDate(body.join_date);
    const workLocation = parseOptionalText(body.work_location);
    const teamName = parseOptionalText(body.team_name);

    const users = await query<
      {
        id: number;
        employee_no: string;
        name_en: string | null;
        name_cn: string | null;
        division_id: number | null;
      }[]
    >(
      `
      SELECT
        id,
        employee_no,
        name_en,
        name_cn,
        division_id
      FROM users
      WHERE employee_no = ?
      LIMIT 1
      `,
      [employeeId],
    );

    if (!users.length) {
      return NextResponse.json(
        {
          error: `Employee ID "${employeeId}" was not found in users.`,
        },
        { status: 404 },
      );
    }

    const userId = users[0].id;

    if (users[0].employee_no === "SUPERADMIN") {
      return NextResponse.json(
        { error: "SUPERADMIN is not an employee." },
        { status: 400 },
      );
    }

    if (managerId === userId) {
      return NextResponse.json(
        { error: "Employee cannot be their own manager." },
        { status: 400 },
      );
    }

    const divisionRows = await query<
      {
        id: number;
        name_en: string;
        name_cn: string | null;
      }[]
    >(
      `
      SELECT
        id,
        name_en,
        name_cn
      FROM divisions
      WHERE
        LOWER(TRIM(name_en)) = LOWER(TRIM(?))
        OR LOWER(TRIM(COALESCE(name_cn, ''))) = LOWER(TRIM(?))
      LIMIT 1
      `,
      [department, department],
    );

    if (!divisionRows.length) {
      return NextResponse.json(
        { error: `Department "${department}" was not found.` },
        { status: 400 },
      );
    }

    const divisionId = divisionRows[0].id;

    const existing = await query<{ id: number }[]>(
      `
      SELECT id
      FROM employee_organization
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId],
    );

    if (existing.length) {
      return NextResponse.json(
        {
          error: "Organization data already exists for this employee.",
        },
        { status: 409 },
      );
    }

    const result = await withTransaction(async (conn) => {
      await conn.execute(
        `
        UPDATE users
        SET
          name_en = ?,
          name_cn = ?,
          division_id = ?
        WHERE id = ?
        `,
        [name, nameCn, divisionId, userId],
      );

      const [insertResult] = await conn.execute(
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
    });

    return NextResponse.json(
      {
        ok: true,
        action: "created",
        user_id: userId,
        employee_id: employeeId,
        id: "insertId" in result ? result.insertId : null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/organization/employees failed",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create employee organization data.",
      },
      { status: 500 },
    );
  }
}
