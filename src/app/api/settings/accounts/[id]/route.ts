import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import {
  canAssignPrivilegedRoles,
  generateTemporaryPassword,
  isProtectedAccountEmployeeNo,
  isProtectedRoleName,
  loadPermissionsForRole,
  MIN_PASSWORD_LENGTH,
  PERMISSIONS,
  permissionsIncludeAdminManage,
  requirePermission,
  resetPassword,
} from "@/lib/auth";
import { execute, query } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

async function roleIsPrivileged(roleId: number): Promise<boolean> {
  const roles = await query<RowDataPacket[]>("SELECT name FROM roles WHERE id = ? LIMIT 1", [
    roleId,
  ]);
  const name = roles[0]?.name;
  if (typeof name !== "string") return false;
  if (isProtectedRoleName(name) || name === "admin") return true;
  const permissions = await loadPermissionsForRole(roleId);
  return permissionsIncludeAdminManage(permissions);
}

export async function PUT(request: NextRequest, context: Ctx) {
  const gate = await requirePermission(PERMISSIONS.adminAccountsManage);
  if (gate instanceof NextResponse) return gate;
  if (!gate.session || !gate.account) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { id: idParam } = await context.params;
    const id = Number(idParam);
    if (!id) {
      return NextResponse.json({ error: "Invalid account id." }, { status: 400 });
    }

    const body = await request.json();
    const roleId =
      body.role_id === null || body.role_id === "" || body.role_id === undefined
        ? null
        : Number(body.role_id);
    const isActive = body.is_active === undefined ? undefined : Boolean(body.is_active);
    const generateTemp = Boolean(body.generate_temporary_password);
    const newPassword = typeof body.password === "string" ? body.password : undefined;
    const confirmPassword =
      typeof body.confirm_password === "string" ? body.confirm_password : undefined;

    if (roleId !== null && Number.isNaN(roleId)) {
      return NextResponse.json({ error: "Invalid role id." }, { status: 400 });
    }

    if (generateTemp && newPassword !== undefined && newPassword.length > 0) {
      return NextResponse.json(
        {
          error: "Provide either a manual password or generate_temporary_password, not both.",
        },
        { status: 400 }
      );
    }

    if (!generateTemp && newPassword !== undefined && newPassword.length > 0) {
      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { error: "New password and confirmation do not match." },
          { status: 400 }
        );
      }
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
          {
            error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
          },
          { status: 400 }
        );
      }
    }

    if (roleId !== null) {
      const roles = await query<RowDataPacket[]>("SELECT id FROM roles WHERE id = ? LIMIT 1", [
        roleId,
      ]);
      if (!roles[0]) {
        return NextResponse.json({ error: "Role not found." }, { status: 404 });
      }
    }

    const current = await query<RowDataPacket[]>(
      `SELECT su.id, su.role_id, r.name AS role_name, u.employee_no
       FROM system_users su
       LEFT JOIN roles r ON r.id = su.role_id
       LEFT JOIN users u ON u.id = su.user_id
       WHERE su.id = ?
       LIMIT 1`,
      [id]
    );
    if (!current[0]) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const protectedAccount = isProtectedAccountEmployeeNo(current[0].employee_no as string | null);

    const wasAdmin = current[0].role_name === "admin";
    let nextIsAdmin = wasAdmin;
    if (roleId !== null) {
      const nextRole = await query<RowDataPacket[]>("SELECT name FROM roles WHERE id = ? LIMIT 1", [
        roleId,
      ]);
      nextIsAdmin = nextRole[0]?.name === "admin";
    } else if (roleId === null && body.role_id !== undefined) {
      nextIsAdmin = false;
    }

    const willUpdateRole = body.role_id !== undefined;
    if (willUpdateRole) {
      const currentRoleId =
        current[0].role_id === null || current[0].role_id === undefined
          ? null
          : Number(current[0].role_id);
      const roleChanged = currentRoleId !== roleId;

      if (roleChanged && protectedAccount) {
        return NextResponse.json(
          { error: "The Super Admin account role cannot be changed." },
          { status: 400 }
        );
      }

      if (roleChanged && roleId !== null) {
        const assignedRole = await query<RowDataPacket[]>(
          "SELECT name FROM roles WHERE id = ? LIMIT 1",
          [roleId]
        );
        if (isProtectedRoleName(assignedRole[0]?.name as string | undefined)) {
          return NextResponse.json(
            { error: "The Super Admin role cannot be assigned." },
            { status: 400 }
          );
        }
      }

      if (roleChanged) {
        if (id === gate.session.systemUserId && !canAssignPrivilegedRoles(gate.account)) {
          return NextResponse.json({ error: "You cannot change your own role." }, { status: 403 });
        }

        const assigningPrivileged = roleId !== null ? await roleIsPrivileged(roleId) : false;
        if (assigningPrivileged && !canAssignPrivilegedRoles(gate.account)) {
          return NextResponse.json(
            {
              error: "Assigning admin or privileged roles requires roles-manage permission.",
            },
            { status: 403 }
          );
        }
      }
    }

    if (protectedAccount && isActive === false) {
      return NextResponse.json(
        { error: "The Super Admin account cannot be deactivated." },
        { status: 400 }
      );
    }

    if (wasAdmin && !nextIsAdmin) {
      const adminCount = await query<RowDataPacket[]>(
        `SELECT COUNT(*) AS c
         FROM system_users su
         INNER JOIN roles r ON r.id = su.role_id
         WHERE r.name = 'admin' AND su.is_active = 1`
      );
      if (Number(adminCount[0]?.c ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last active admin." },
          { status: 409 }
        );
      }
    }

    if (wasAdmin && isActive === false) {
      const adminCount = await query<RowDataPacket[]>(
        `SELECT COUNT(*) AS c
         FROM system_users su
         INNER JOIN roles r ON r.id = su.role_id
         WHERE r.name = 'admin' AND su.is_active = 1`
      );
      if (Number(adminCount[0]?.c ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot deactivate the last active admin." },
          { status: 409 }
        );
      }
    }

    const willUpdateActive = isActive !== undefined;
    const willResetPassword = generateTemp || (newPassword !== undefined && newPassword.length > 0);

    if (!willUpdateRole && !willUpdateActive && !willResetPassword) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    if (willUpdateRole && willUpdateActive) {
      await execute(
        `UPDATE system_users
         SET role_id = ?, is_active = ?,
             session_version = COALESCE(session_version, 1) + 1
         WHERE id = ?`,
        [roleId, isActive ? 1 : 0, id]
      );
    } else if (willUpdateRole) {
      await execute(
        `UPDATE system_users
         SET role_id = ?,
             session_version = COALESCE(session_version, 1) + 1
         WHERE id = ?`,
        [roleId, id]
      );
    } else if (willUpdateActive) {
      await execute(
        `UPDATE system_users
         SET is_active = ?,
             session_version = COALESCE(session_version, 1) + 1
         WHERE id = ?`,
        [isActive ? 1 : 0, id]
      );
    }

    let temporaryPassword: string | undefined;
    if (willResetPassword) {
      const passwordToSet = generateTemp ? generateTemporaryPassword() : (newPassword as string);
      const ok = await resetPassword(id, passwordToSet);
      if (!ok) {
        return NextResponse.json({ error: "Account not found." }, { status: 404 });
      }
      if (generateTemp) {
        temporaryPassword = passwordToSet;
      }
    }

    return NextResponse.json(temporaryPassword ? { ok: true, temporaryPassword } : { ok: true });
  } catch (error) {
    console.error("PUT /api/settings/accounts/[id] failed", error);
    return NextResponse.json({ error: "Failed to update account." }, { status: 500 });
  }
}
