import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";

export const dynamic = "force-dynamic";

type ScheduleType = "1" | "4" | "OFF";

type WorkScheduleRow = {
  id: number;
  employee_organization_id: number;
  employee_no: string;
  schedule_date: string;
  schedule_type: ScheduleType;
  rotation_rule_id: number | null;
};

type RequestBody = {
  employeeNo?: unknown;
  date?: unknown;
  dates?: unknown;
  scheduleType?: unknown;
  scheduleTypes?: unknown;
};

async function resolveEmployeeOrganizationId(
  employeeNo: string,
): Promise<number | null> {
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

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidScheduleType(
  value: unknown,
): value is ScheduleType {
  return value === "1" || value === "4" || value === "OFF";
}

function normalizeDate(value: unknown): string {
  return String(value ?? "").trim();
}

async function loadEmployeeWorkSchedules(
  employeeNo: string,
): Promise<WorkScheduleRow[]> {
  return query<WorkScheduleRow[]>(
    `
      SELECT
        ss.id,
        eo.id AS employee_organization_id,
        u.employee_no,
        ss.schedule_date,
        ss.schedule_type,
        ss.rotation_rule_id
      FROM shift_schedules ss
      INNER JOIN users u
        ON u.employee_no = ss.employee_no
      INNER JOIN employee_organization eo
        ON eo.user_id = u.id
      WHERE u.employee_no = ?
        AND ss.schedule_type IN ('1', '4', 'OFF')
        AND ss.shift_code IS NULL
        AND ss.rotation_rule_id IS NULL
      ORDER BY
        ss.schedule_date ASC,
        ss.id ASC
    `,
    [employeeNo],
  );
}

/* =========================================================
   GET
   /api/organization/shift-management/work-schedules

   Optional:
   ?employeeNo=62000085
   ========================================================= */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const employeeNo =
      searchParams.get("employeeNo")?.trim() || "";

    let rows: WorkScheduleRow[];

    if (employeeNo) {
      const employeeOrganizationId =
        await resolveEmployeeOrganizationId(employeeNo);

      if (!employeeOrganizationId) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      rows = await loadEmployeeWorkSchedules(employeeNo);
    } else {
      rows = await query<WorkScheduleRow[]>(
        `
          SELECT
            ss.id,
            eo.id AS employee_organization_id,
            u.employee_no,
            ss.schedule_date,
            ss.schedule_type,
            ss.rotation_rule_id
          FROM shift_schedules ss
          INNER JOIN users u
            ON u.employee_no = ss.employee_no
          INNER JOIN employee_organization eo
            ON eo.user_id = u.id
          WHERE ss.schedule_type IN ('1', '4', 'OFF')
            AND ss.shift_code IS NULL
            AND ss.rotation_rule_id IS NULL
          ORDER BY
            ss.employee_no ASC,
            ss.schedule_date ASC,
            ss.id ASC
        `,
      );
    }

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET work schedules failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load work schedules.",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   POST
   Single date:

   {
     employeeNo: "62000085",
     date: "2026-09-01",
     scheduleType: "1"
   }

   Multiple dates:

   {
     employeeNo: "62000085",
     dates: ["2026-09-01", "2026-09-02"],
     scheduleTypes: ["1", "4"]
   }
   ========================================================= */

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    const employeeNo = String(body.employeeNo ?? "").trim();

    if (!employeeNo) {
      return NextResponse.json(
        {
          success: false,
          error: "employeeNo is required.",
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
          error: "Employee could not be resolved.",
        },
        { status: 404 },
      );
    }

    /* =====================================================
       MULTIPLE DATES
       ===================================================== */

    if (Array.isArray(body.dates)) {
      const dates: string[] = body.dates.map(
        (value: unknown): string => normalizeDate(value),
      );

      if (
        dates.length === 0 ||
        dates.some(
          (date: string): boolean => !isValidDate(date),
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "dates must contain valid YYYY-MM-DD values.",
          },
          { status: 400 },
        );
      }

      if (!Array.isArray(body.scheduleTypes)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "scheduleTypes must be an array.",
          },
          { status: 400 },
        );
      }

      const scheduleTypes: unknown[] = body.scheduleTypes;

      if (scheduleTypes.length !== dates.length) {
        return NextResponse.json(
          {
            success: false,
            error:
              "dates and scheduleTypes must have the same length.",
          },
          { status: 400 },
        );
      }

      for (let index = 0; index < dates.length; index += 1) {
        const date = dates[index];
        const scheduleType = scheduleTypes[index];

        if (!isValidScheduleType(scheduleType)) {
          return NextResponse.json(
            {
              success: false,
              error:
                "scheduleTypes must contain only 1, 4, or OFF.",
            },
            { status: 400 },
          );
        }

        await execute(
          `
            INSERT INTO shift_schedules (
              employee_no,
              schedule_date,
              shift_code,
              schedule_type,
              rotation_rule_id
            )
            VALUES (?, ?, NULL, ?, NULL)
            ON DUPLICATE KEY UPDATE
              shift_code = NULL,
              schedule_type = VALUES(schedule_type),
              rotation_rule_id = NULL
          `,
          [
            employeeNo,
            date,
            scheduleType,
          ],
        );
      }

      const rows =
        await loadEmployeeWorkSchedules(employeeNo);

      return NextResponse.json({
        success: true,
        data: rows,
      });
    }

    /* =====================================================
       SINGLE DATE
       ===================================================== */

    const date = normalizeDate(body.date);
    const scheduleType = body.scheduleType;

    if (!isValidDate(date)) {
      return NextResponse.json(
        {
          success: false,
          error: "date must be YYYY-MM-DD.",
        },
        { status: 400 },
      );
    }

    if (!isValidScheduleType(scheduleType)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "scheduleType must be 1, 4, or OFF.",
        },
        { status: 400 },
      );
    }

    await execute(
      `
        INSERT INTO shift_schedules (
          employee_no,
          schedule_date,
          shift_code,
          schedule_type,
          rotation_rule_id
        )
        VALUES (?, ?, NULL, ?, NULL)
        ON DUPLICATE KEY UPDATE
          shift_code = NULL,
          schedule_type = VALUES(schedule_type),
          rotation_rule_id = NULL
      `,
      [
        employeeNo,
        date,
        scheduleType,
      ],
    );

    const rows =
      await loadEmployeeWorkSchedules(employeeNo);

    const savedRow =
      rows.find(
        (row: WorkScheduleRow): boolean =>
          String(row.schedule_date).slice(0, 10) === date,
      ) ?? null;

    return NextResponse.json({
      success: true,
      data: savedRow,
    });
  } catch (error) {
    console.error(
      "POST work schedule failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save work schedule.",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   DELETE

   Single:
   {
     employeeNo: "62000085",
     date: "2026-09-01"
   }

   Multiple:
   {
     employeeNo: "62000085",
     dates: ["2026-09-01", "2026-09-02"]
   }
   ========================================================= */

export async function DELETE(
  request: NextRequest,
) {
  try {
    const body = (await request.json()) as RequestBody;

    const employeeNo = String(
      body.employeeNo ?? "",
    ).trim();

    if (!employeeNo) {
      return NextResponse.json(
        {
          success: false,
          error: "employeeNo is required.",
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
          error:
            "Employee could not be resolved.",
        },
        { status: 404 },
      );
    }

    const dates: string[] = Array.isArray(body.dates)
      ? body.dates.map(
          (value: unknown): string =>
            normalizeDate(value),
        )
      : body.date !== undefined
        ? [normalizeDate(body.date)]
        : [];

    if (
      dates.length === 0 ||
      dates.some(
        (date: string): boolean =>
          !isValidDate(date),
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "date or dates with valid YYYY-MM-DD values are required.",
        },
        { status: 400 },
      );
    }

    for (const date of dates) {
      await execute(
        `
          DELETE FROM shift_schedules
          WHERE employee_no = ?
            AND schedule_date = ?
            AND schedule_type IN ('1', '4', 'OFF')
            AND shift_code IS NULL
            AND rotation_rule_id IS NULL
        `,
        [
          employeeNo,
          date,
        ],
      );
    }

    return NextResponse.json({
      success: true,
      deletedDates: dates,
    });
  } catch (error) {
    console.error(
      "DELETE work schedule failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete work schedule.",
      },
      { status: 500 },
    );
  }
}