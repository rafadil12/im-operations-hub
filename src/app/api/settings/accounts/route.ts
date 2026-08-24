import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import {
  canAssignPrivilegedRoles,
  generateTemporaryPassword,
  hashPassword,
  isProtectedAccountEmployeeNo,
  isProtectedRoleName,
  loadPermissionsForRole,
  MIN_PASSWORD_LENGTH,
  PERMISSIONS,
  permissionsIncludeAdminManage,
  requirePermission,
} from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";

async function roleIsPrivileged(roleId: number): Promise<boolean> {
  const roles = await query<RowDataPacket[]>(
    "SELECT name FROM roles WHERE id = ? LIMIT 1",
    [roleId],
  );
  const name = roles[0]?.name;
  if (typeof name !== "string") return false;
  if (isProtectedRoleName(name) || name === "admin") return true;
  const permissions = await loadPermissionsForRole(roleId);
  return permissionsIncludeAdminManage(permissions);
}

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.adminAccountsManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const rows = await query<RowDataPacket[]>(
      `SELECT
         su.id,
         su.user_id,
         su.is_active,
         su.role_id,
         su.last_login_at,
         u.employee_no,
         u.name_en,
         u.name_cn,
         r.name AS role_name
       FROM system_users su
       INNER JOIN users u ON u.id = su.user_id
       LEFT JOIN roles r ON r.id = su.role_id
       ORDER BY u.employee_no`,
    );

    const callerIsSuperAdmin = isProtectedAccountEmployeeNo(
      gate.account?.employeeId,
    );
    const visible = rows.filter((r) => {
      if (callerIsSuperAdmin) return true;
      return !isProtectedAccountEmployeeNo(r.employee_no as string | null);
    });

    const divisions = await query<RowDataPacket[]>(
      "SELECT id, name_en, name_cn FROM divisions ORDER BY name_en",
    );

    return NextResponse.json({
      rows: visible.map((r) => ({
        id: Number(r.id),
        userId: Number(r.user_id),
        employeeNo: (r.employee_no as string | null) ?? null,
        nameEn: (r.name_en as string | null) ?? null,
        nameCn: (r.name_cn as string | null) ?? null,
        isActive: Boolean(r.is_active),
        roleId: r.role_id != null ? Number(r.role_id) : null,
        roleName: (r.role_name as string | null) ?? null,
        lastLoginAt: (r.last_login_at as string | null) ?? null,
      })),
      divisions: divisions.map((d) => ({
        id: Number(d.id),
        nameEn: (d.name_en as string | null) ?? null,
        nameCn: (d.name_cn as string | null) ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/settings/accounts failed", error);
    return NextResponse.json(
      { error: "Failed to load accounts." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.adminAccountsManage);
  if (gate instanceof NextResponse) return gate;
  if (!gate.session || !gate.account) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const employeeNo = body.employee_no?.toString().trim() ?? "";
    const nameEn = body.name_en?.toString().trim() || null;
    const nameCn = body.name_cn?.toString().trim() || null;
    const divisionId =
      body.division_id === null ||
      body.division_id === "" ||
      body.division_id === undefined
        ? null
        : Number(body.division_id);
    const roleId =
      body.role_id === null || body.role_id === "" || body.role_id === undefined
        ? null
        : Number(body.role_id);
    const isActive =
      body.is_active === undefined ? true : Boolean(body.is_active);
    const generateTemp = Boolean(body.generate_temporary_password);
    const newPassword =
      typeof body.password === "string" ? body.password : "";
    const confirmPassword =
      typeof body.confirm_password === "string"
        ? body.confirm_password
        : undefined;

    if (!employeeNo) {
      return NextResponse.json(
        { error: "Employee ID is required." },
        { status: 400 },
      );
    }
    if (isProtectedAccountEmployeeNo(employeeNo)) {
      return NextResponse.json(
        { error: "That Employee ID is reserved." },
        { status: 400 },
      );
    }
    if (!nameEn && !nameCn) {
      return NextResponse.json(
        { error: "Name (EN or CN) is required." },
        { status: 400 },
      );
    }
    if (divisionId !== null && Number.isNaN(divisionId)) {
      return NextResponse.json(
        { error: "Invalid division id." },
        { status: 400 },
      );
    }
    if (roleId !== null && Number.isNaN(roleId)) {
      return NextResponse.json({ error: "Invalid role id." }, { status: 400 });
    }

    if (generateTemp && newPassword.length > 0) {
      return NextResponse.json(
        {
          error:
            "Provide either a manual password or generate_temporary_password, not both.",
        },
        { status: 400 },
      );
    }

    let passwordToSet: string;
    if (generateTemp) {
      passwordToSet = generateTemporaryPassword();
    } else {
      if (!newPassword) {
        return NextResponse.json(
          { error: "Password is required." },
          { status: 400 },
        );
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { error: "New password and confirmation do not match." },
          { status: 400 },
        );
      }
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
          {
            error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
          },
          { status: 400 },
        );
      }
      passwordToSet = newPassword;
    }

    if (roleId !== null) {
      const roles = await query<RowDataPacket[]>(
        "SELECT id, name FROM roles WHERE id = ? LIMIT 1",
        [roleId],
      );
      if (!roles[0]) {
        return NextResponse.json({ error: "Role not found." }, { status: 404 });
      }
      const roleName = String(roles[0].name ?? "");
      if (isProtectedRoleName(roleName)) {
        return NextResponse.json(
          { error: "The Super Admin role cannot be assigned." },
          { status: 400 },
        );
      }
      if (
        (await roleIsPrivileged(roleId)) &&
        !canAssignPrivilegedRoles(gate.account)
      ) {
        return NextResponse.json(
          {
            error:
              "Assigning admin or privileged roles requires roles-manage permission.",
          },
          { status: 403 },
        );
      }
    }

    if (divisionId !== null) {
      const divisions = await query<RowDataPacket[]>(
        "SELECT id FROM divisions WHERE id = ? LIMIT 1",
        [divisionId],
      );
      if (!divisions[0]) {
        return NextResponse.json(
          { error: "Division not found." },
          { status: 404 },
        );
      }
    }

    const existing = await query<RowDataPacket[]>(
      "SELECT id FROM users WHERE employee_no = ? LIMIT 1",
      [employeeNo],
    );
    if (existing[0]) {
      return NextResponse.json(
        { error: "Employee ID already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(passwordToSet);
    const created = await withTransaction(async (conn) => {
      const [userResult] = await conn.execute(
        "INSERT INTO users (employee_no, name_cn, name_en, division_id) VALUES (?, ?, ?, ?)",
        [employeeNo, nameCn, nameEn, divisionId],
      );
      const userId = Number((userResult as { insertId: number }).insertId);
      const [accountResult] = await conn.execute(
        `INSERT INTO system_users
           (user_id, password_hash, is_active, role_id, session_version, is_daily_operation_pic)
         VALUES (?, ?, ?, ?, 1, 0)`,
        [userId, passwordHash, isActive ? 1 : 0, roleId],
      );
      return {
        id: Number((accountResult as { insertId: number }).insertId),
        userId,
      };
    });

    return NextResponse.json(
      generateTemp
        ? { ok: true, id: created.id, userId: created.userId, temporaryPassword: passwordToSet }
        : { ok: true, id: created.id, userId: created.userId },
      { status: 201 },
    );
  } catch (error) {
    const errno = (error as { errno?: number }).errno;
    if (errno === 1062) {
      return NextResponse.json(
        { error: "Employee ID already exists." },
        { status: 409 },
      );
    }
    console.error("POST /api/settings/accounts failed", error);
    return NextResponse.json(
      { error: "Failed to create account." },
      { status: 500 },
    );
  }
}
