import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";

export const dynamic = "force-dynamic";

type LeaveType = "AL" | "MC" | "UPL" | "OT" | "ALPA" | "NO_ATTENDANCE";
type NoAttendanceType = "NO_CHECK_IN" | "NO_CHECK_OUT" | "NO_CHECK_IN_OUT";
type LeaveStatus = "Pending" | "Approved" | "Rejected";

type LeaveRequestRow = {
  id: number;
  employee_no: string;
  request_date: string;
  request_type: LeaveType;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  status: LeaveStatus;
  oa_number: string | null;
  no_attendance_type: NoAttendanceType | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

type EmployeeOrganizationRow = {
  user_id: number;
  employee_no: string;
  manager_id: number | null;
  manager_employee_no: string | null;
  manager_name_en: string | null;
  manager_name_cn: string | null;
  employment_status: string | null;
};

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isLeaveType(value: unknown): value is LeaveType {
  return (
    value === "AL" ||
    value === "MC" ||
    value === "UPL" ||
    value === "OT" ||
    value === "ALPA" ||
    value === "NO_ATTENDANCE"
  );
}

function isNoAttendanceType(value: unknown): value is NoAttendanceType {
  return (
    value === "NO_CHECK_IN" ||
    value === "NO_CHECK_OUT" ||
    value === "NO_CHECK_IN_OUT"
  );
}

function parseOaNumber(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function isLeaveStatus(value: unknown): value is LeaveStatus {
  return value === "Pending" || value === "Approved" || value === "Rejected";
}

function normalizeTime(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  const raw = String(value).trim();

  if (!raw) return null;

  // Accept HH:mm and HH:mm:ss without relying on a fragile escaped regex.
  const parts = raw.split(":");
  if (parts.length < 2 || parts.length > 3) return null;

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  const second = parts.length === 3 ? Number(parts[2]) : 0;

  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59 ||
    !Number.isInteger(second) ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number {
  const normalized = normalizeTime(value);

  if (!normalized) return Number.NaN;

  const [hour, minute] = normalized.split(":").map(Number);
  return hour * 60 + minute;
}

/* =========================================================
   GET
   /api/organization/attendance/leave

   Optional:
   ?employeeNo=62000085
   ?date=2026-08-28
   ?status=Pending
   ?year=2026
   ?month=8
   ========================================================= */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const employeeNo = searchParams.get("employeeNo")?.trim() || null;
    const date = searchParams.get("date")?.trim() || null;
    const status = searchParams.get("status")?.trim() || null;

    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const year = yearParam ? Number(yearParam) : null;
    const month = monthParam ? Number(monthParam) : null;

    if (date && !isValidDate(date)) {
      return NextResponse.json(
        { success: false, error: "date must be in YYYY-MM-DD format." },
        { status: 400 },
      );
    }

    if (
      year !== null &&
      (!Number.isInteger(year) || year < 2000 || year > 2100)
    ) {
      return NextResponse.json(
        { success: false, error: "year must be a valid year." },
        { status: 400 },
      );
    }

    if (
      month !== null &&
      (!Number.isInteger(month) || month < 1 || month > 12)
    ) {
      return NextResponse.json(
        { success: false, error: "month must be between 1 and 12." },
        { status: 400 },
      );
    }

    if (status && !isLeaveStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "status must be Pending, Approved, or Rejected.",
        },
        { status: 400 },
      );
    }

    const conditions: string[] = ["1 = 1"];
    const params: Array<string | number> = [];

    if (employeeNo) {
      conditions.push("r.employee_no = ?");
      params.push(employeeNo);
    }

    if (date) {
      conditions.push("r.request_date = ?");
      params.push(date);
    }

    if (status) {
      conditions.push("r.status = ?");
      params.push(status);
    }

    if (year !== null && month !== null) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

      conditions.push(
        "r.request_date >= ? AND r.request_date < DATE_ADD(?, INTERVAL 1 MONTH)",
      );
      params.push(startDate, startDate);
    } else if (year !== null) {
      const startDate = `${year}-01-01`;

      conditions.push(
        "r.request_date >= ? AND r.request_date < DATE_ADD(?, INTERVAL 1 YEAR)",
      );
      params.push(startDate, startDate);
    }

    const rows = await query<
      (LeaveRequestRow & {
        employee_name_en: string | null;
        employee_name_cn: string | null;
        department_en: string | null;
        department_cn: string | null;
        manager_id: number | null;
        manager_employee_no: string | null;
        manager_name_en: string | null;
        manager_name_cn: string | null;
      })[]
    >(
      `
        SELECT
          r.id,
          r.employee_no,
          r.request_date,
          r.request_type,
          r.start_time,
          r.end_time,
          r.reason,
          r.status,
          r.oa_number,
          r.no_attendance_type,
          r.created_by,
          r.approved_by,
          r.approved_at,
          r.created_at,
          r.updated_at,

          u.name_en AS employee_name_en,
          u.name_cn AS employee_name_cn,

          eo.manager_id,
          manager.employee_no AS manager_employee_no,
          manager.name_en AS manager_name_en,
          manager.name_cn AS manager_name_cn

        FROM attendance_leave_requests r

        /*
         * Department is intentionally not read from employee_organization.
         * employee_organization does not contain division_name_en/division_name_cn.
         * The UI already resolves department from the Employee API.
         */

        INNER JOIN users u
          ON u.employee_no = r.employee_no

        LEFT JOIN employee_organization eo
          ON eo.user_id = u.id

        LEFT JOIN users manager
          ON manager.id = eo.manager_id

        WHERE ${conditions.join(" AND ")}

        ORDER BY
          r.request_date DESC,
          r.created_at DESC,
          r.id DESC
      `,
      params,
    );

    return NextResponse.json(
      {
        success: true,
        data: rows,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("GET /api/organization/attendance/leave failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load leave requests.",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   POST
   ========================================================= */

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      employeeNo?: unknown;
      date?: unknown;
      requestType?: unknown;
      oaNumber?: unknown;
      noAttendanceType?: unknown;
      startTime?: unknown;
      endTime?: unknown;
      reason?: unknown;
      createdBy?: unknown;
    };

    const employeeNo = String(body.employeeNo ?? "").trim();
    const date = String(body.date ?? "").trim();
    const requestType = String(body.requestType ?? "").trim();
    const oaNumber = parseOaNumber(body.oaNumber);
    const noAttendanceTypeRaw = body.noAttendanceType;
    const noAttendanceType =
      noAttendanceTypeRaw === undefined || noAttendanceTypeRaw === null
        ? null
        : String(noAttendanceTypeRaw).trim();
    const startTime = normalizeTime(body.startTime);
    const endTime = normalizeTime(body.endTime);
    const reason = String(body.reason ?? "").trim();
    const createdBy = String(body.createdBy ?? "").trim();

    if (!employeeNo) {
      return NextResponse.json(
        { success: false, error: "employeeNo is required." },
        { status: 400 },
      );
    }

    if (!isValidDate(date)) {
      return NextResponse.json(
        { success: false, error: "date must be in YYYY-MM-DD format." },
        { status: 400 },
      );
    }

    if (!isLeaveType(requestType)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "requestType must be AL, MC, UPL, OT, ALPA, or NO_ATTENDANCE.",
        },
        { status: 400 },
      );
    }

    if (requestType === "NO_ATTENDANCE") {
      if (!isNoAttendanceType(noAttendanceType)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "noAttendanceType must be NO_CHECK_IN, NO_CHECK_OUT, or NO_CHECK_IN_OUT when requestType is NO_ATTENDANCE.",
          },
          { status: 400 },
        );
      }
    } else if (noAttendanceType) {
      return NextResponse.json(
        {
          success: false,
          error: "noAttendanceType is only allowed for NO_ATTENDANCE requests.",
        },
        { status: 400 },
      );
    }

    if (requestType !== "NO_ATTENDANCE") {
      if (!startTime) {
        return NextResponse.json(
          {
            success: false,
            error: "startTime must be in HH:mm format.",
          },
          { status: 400 },
        );
      }

      if (!endTime) {
        return NextResponse.json(
          {
            success: false,
            error: "endTime must be in HH:mm format.",
          },
          { status: 400 },
        );
      }

      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      // AL / MC / UPL / ALPA must stay within the same day.
      // OT may cross midnight (e.g. 22:00 -> 02:00).
      if (requestType !== "OT" && startMinutes >= endMinutes) {
        return NextResponse.json(
          {
            success: false,
            error: "End time must be later than start time.",
          },
          { status: 400 },
        );
      }

      if (requestType === "OT" && startMinutes === endMinutes) {
        return NextResponse.json(
          {
            success: false,
            error: "OT start time and end time cannot be the same.",
          },
          { status: 400 },
        );
      }
    }

    if (!reason) {
      return NextResponse.json(
        { success: false, error: "reason is required." },
        { status: 400 },
      );
    }

    const employeeRows = await query<EmployeeOrganizationRow[]>(
      `
        SELECT
          u.id AS user_id,
          u.employee_no,
          eo.manager_id,
          manager.employee_no AS manager_employee_no,
          manager.name_en AS manager_name_en,
          manager.name_cn AS manager_name_cn,
          eo.employment_status

        FROM users u

        LEFT JOIN employee_organization eo
          ON eo.user_id = u.id

        LEFT JOIN users manager
          ON manager.id = eo.manager_id

        WHERE u.employee_no = ?
          AND u.employee_no <> 'SUPERADMIN'
        LIMIT 1
      `,
      [employeeNo],
    );

    if (!employeeRows.length) {
      return NextResponse.json(
        {
          success: false,
          error: `Employee ${employeeNo} was not found.`,
        },
        { status: 404 },
      );
    }

    const employee = employeeRows[0];

    if (employee.employment_status && employee.employment_status !== "Active") {
      return NextResponse.json(
        {
          success: false,
          error: `Employee ${employeeNo} is not Active.`,
        },
        { status: 409 },
      );
    }

    await execute(
      `
        INSERT INTO attendance_leave_requests (
          employee_no,
          request_date,
          request_type,
          oa_number,
          no_attendance_type,
          start_time,
          end_time,
          reason,
          status,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
      `,
      [
        employeeNo,
        date,
        requestType,
        oaNumber,
        requestType === "NO_ATTENDANCE" ? noAttendanceType : null,
        requestType === "NO_ATTENDANCE" ? null : startTime,
        requestType === "NO_ATTENDANCE" ? null : endTime,
        reason,
        createdBy || employeeNo,
      ],
    );

    const savedRows = await query<LeaveRequestRow[]>(
      `
        SELECT
          id,
          employee_no,
          request_date,
          request_type,
          start_time,
          end_time,
          reason,
          status,
          oa_number,
          no_attendance_type,
          created_by,
          approved_by,
          approved_at,
          created_at,
          updated_at
        FROM attendance_leave_requests
        WHERE employee_no = ?
          AND request_date = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [employeeNo, date],
    );

    const saved = savedRows[0];

    if (!saved) {
      return NextResponse.json(
        {
          success: false,
          error: "Leave request was inserted but could not be read back.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Leave / permission request created successfully.",
        data: saved,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/organization/attendance/leave failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create leave request.",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   PATCH
   Approve / Reject

   IMPORTANT:
   The client must provide the manager employee number in
   approvedBy for this version.

   The server DOES NOT trust the target request alone.
   It verifies:

   request employee
      -> employee_organization.manager_id
      -> manager.user.employee_no
      -> approvedBy

   If they do not match => 403.

   This matches the existing organization hierarchy where
   manager_id is stored in employee_organization.
   ========================================================= */

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: unknown;
      status?: unknown;
      approvedBy?: unknown;
      oaNumber?: unknown;
    };

    const id = Number(body.id);
    const status = String(body.status ?? "").trim();
    const approvedBy = String(body.approvedBy ?? "").trim();
    const hasOaNumber = Object.prototype.hasOwnProperty.call(body, "oaNumber");
    const oaNumber =
      body.oaNumber === null || body.oaNumber === undefined
        ? ""
        : String(body.oaNumber).trim();

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "id must be a valid request id.",
        },
        { status: 400 },
      );
    }

    /*
     * OA Number update:
     * - Can only be changed after the request is Approved.
     * - This branch is intentionally separate from approval/rejection so the
     *   frontend can save Number OA without resending approvedBy.
     */
    if (hasOaNumber) {
      if (status || approvedBy) {
        return NextResponse.json(
          {
            success: false,
            error: "OA Number update must only contain id and oaNumber.",
          },
          { status: 400 },
        );
      }

      const oaRows = await query<{ id: number; status: LeaveStatus }[]>(
        `
          SELECT id, status
          FROM attendance_leave_requests
          WHERE id = ?
          LIMIT 1
        `,
        [id],
      );

      const existingOa = oaRows[0];

      if (!existingOa) {
        return NextResponse.json(
          {
            success: false,
            error: `Leave request ${id} was not found.`,
          },
          { status: 404 },
        );
      }

      if (existingOa.status !== "Approved") {
        return NextResponse.json(
          {
            success: false,
            error: "Number OA can only be updated after the request is Approved.",
          },
          { status: 409 },
        );
      }

      if (oaNumber.length > 100) {
        return NextResponse.json(
          {
            success: false,
            error: "Number OA must not exceed 100 characters.",
          },
          { status: 400 },
        );
      }

      await execute(
        `
          UPDATE attendance_leave_requests
          SET oa_number = ?
          WHERE id = ?
            AND status = 'Approved'
        `,
        [oaNumber || null, id],
      );

      const savedOaRows = await query<LeaveRequestRow[]>(
        `
          SELECT
            id,
            employee_no,
            request_date,
            request_type,
            start_time,
            end_time,
            reason,
            status,
            oa_number,
            created_by,
            approved_by,
            approved_at,
            created_at,
            updated_at
          FROM attendance_leave_requests
          WHERE id = ?
          LIMIT 1
        `,
        [id],
      );

      const savedOa = savedOaRows[0];

      if (!savedOa) {
        return NextResponse.json(
          {
            success: false,
            error: "OA Number was updated but could not be read back.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Number OA updated successfully.",
        data: savedOa,
      });
    }

    if (status !== "Approved" && status !== "Rejected") {
      return NextResponse.json(
        {
          success: false,
          error: "status must be Approved or Rejected.",
        },
        { status: 400 },
      );
    }

    if (!approvedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "approvedBy is required.",
        },
        { status: 400 },
      );
    }

    const requestRows = await query<
      (LeaveRequestRow & {
        employee_user_id: number;
        manager_id: number | null;
        manager_employee_no: string | null;
        manager_name_en: string | null;
        manager_name_cn: string | null;
      })[]
    >(
      `
        SELECT
          r.id,
          r.employee_no,
          r.request_date,
          r.request_type,
          r.start_time,
          r.end_time,
          r.reason,
          r.status,
          r.oa_number,
          r.no_attendance_type,
          r.created_by,
          r.approved_by,
          r.approved_at,
          r.created_at,
          r.updated_at,

          u.id AS employee_user_id,

          eo.manager_id,
          manager.employee_no AS manager_employee_no,
          manager.name_en AS manager_name_en,
          manager.name_cn AS manager_name_cn

        FROM attendance_leave_requests r

        INNER JOIN users u
          ON u.employee_no = r.employee_no

        LEFT JOIN employee_organization eo
          ON eo.user_id = u.id

        LEFT JOIN users manager
          ON manager.id = eo.manager_id

        WHERE r.id = ?
        LIMIT 1
      `,
      [id],
    );

    const existing = requestRows[0];

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Leave request ${id} was not found.`,
        },
        { status: 404 },
      );
    }

    if (existing.status !== "Pending") {
      return NextResponse.json(
        {
          success: false,
          error:
            `Leave request ${id} is already ` +
            `${existing.status.toLowerCase()}.`,
        },
        { status: 409 },
      );
    }

    /*
     * Approval rules:
     *
     * 1. A Manager may approve/reject their own request.
     * 2. For a subordinate's request, only the direct manager may approve/reject.
     *
     * The current API still receives approvedBy from the client. The UI obtains
     * it from /api/auth/me, while the server verifies that it is either:
     * - the request owner AND a Manager, or
     * - the request owner's direct manager.
     */

    const approverRows = await query<
      {
        id: number;
        employee_no: string;
        employment_status: string | null;
      }[]
    >(
      `
        SELECT
          users.id AS id,
          users.employee_no,
          employee_organization.employment_status
        FROM users
        LEFT JOIN employee_organization
          ON employee_organization.user_id = users.id
        WHERE users.employee_no = ?
          AND users.employee_no <> 'SUPERADMIN'
        LIMIT 1
      `,
      [approvedBy],
    );

    const approver = approverRows[0];

    if (!approver) {
      return NextResponse.json(
        {
          success: false,
          error: "Approver account was not found.",
        },
        { status: 403 },
      );
    }

    if (
      approver.employment_status &&
      approver.employment_status !== "Active"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Approver account is not Active.",
        },
        { status: 403 },
      );
    }

    /*
     * Determine whether the approver is a Manager/Supervisor.
     * In this project the hierarchy is represented by other employees'
     * manager_id pointing to the approver's users.id.
     */
    const managerCheckRows = await query<{ total: number }[]>(
      `
        SELECT COUNT(*) AS total
        FROM employee_organization
        WHERE manager_id = ?
      `,
      [approver.id],
    );

    const isManager = Number(managerCheckRows[0]?.total ?? 0) > 0;

    /*
     * Self-approval:
     * request employee user id equals approver user id, and approver
     * must actually be a Manager/Supervisor.
     */
    const isSelfApproval =
      existing.employee_user_id === approver.id && isManager;

    /*
     * Direct-manager approval:
     * for someone else's request, manager_id must point to the approver.
     */
    const isDirectManager =
      existing.employee_user_id !== approver.id &&
      existing.manager_id === approver.id;

    if (!isSelfApproval && !isDirectManager) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only the employee's direct manager can approve or reject this request, " +
            "or a manager may approve their own request.",
        },
        { status: 403 },
      );
    }

    await execute(
      `
        UPDATE attendance_leave_requests
        SET
          status = ?,
          approved_by = ?,
          approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND status = 'Pending'
      `,
      [status, approvedBy, id],
    );

    const savedRows = await query<LeaveRequestRow[]>(
      `
        SELECT
          id,
          employee_no,
          request_date,
          request_type,
          start_time,
          end_time,
          reason,
          status,
          oa_number,
          no_attendance_type,
          created_by,
          approved_by,
          approved_at,
          created_at,
          updated_at
        FROM attendance_leave_requests
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    const saved = savedRows[0];

    if (!saved) {
      return NextResponse.json(
        {
          success: false,
          error: "Leave request update could not be verified.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        status === "Approved"
          ? "Leave / permission request approved successfully."
          : "Leave / permission request rejected successfully.",
      data: saved,
    });
  } catch (error) {
    console.error("PATCH /api/organization/attendance/leave failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update leave request.",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   DELETE
   Only Pending requests can be deleted.
   ========================================================= */

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: unknown;
    };

    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "id must be a valid request id.",
        },
        { status: 400 },
      );
    }

    const existingRows = await query<
      { id: number; status: LeaveStatus }[]
    >(
      `
        SELECT id, status
        FROM attendance_leave_requests
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    const existing = existingRows[0];

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Leave request ${id} was not found.`,
        },
        { status: 404 },
      );
    }

    if (existing.status !== "Pending") {
      return NextResponse.json(
        {
          success: false,
          error: "Only Pending requests can be deleted.",
        },
        { status: 409 },
      );
    }

    await execute(
      `
        DELETE FROM attendance_leave_requests
        WHERE id = ?
          AND status = 'Pending'
      `,
      [id],
    );

    return NextResponse.json({
      success: true,
      message: "Pending leave / permission request deleted successfully.",
      id,
    });
  } catch (error) {
    console.error("DELETE /api/organization/attendance/leave failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete leave request.",
      },
      { status: 500 },
    );
  }
}
