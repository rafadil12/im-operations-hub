import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import {
  invalidateGuestPermissionsCache,
  isGuestRoleName,
  isProtectedRoleName,
  PERMISSIONS,
  requirePermission,
  validateGuestPermissionIds,
} from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { recordLogsCenter, suppressLogsCenter } from "@/lib/logs-center/record";
import { roleUpdateChanges } from "@/lib/logs-center/roleRemark";

type Ctx = { params: Promise<{ id: string }> };

async function permissionLabels(ids: number[]): Promise<string[]> {
  const unique = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  if (unique.length === 0) return [];
  const placeholders = unique.map(() => "?").join(", ");
  const rows = await query<RowDataPacket[]>(
    `SELECT description, code FROM access_permissions WHERE id IN (${placeholders})`,
    unique
  );
  return rows.map((row) => String(row.description ?? "").trim() || String(row.code));
}

export async function PUT(request: NextRequest, context: Ctx) {
  const gate = await requirePermission(PERMISSIONS.adminRolesManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id: idParam } = await context.params;
    const id = Number(idParam);
    if (!id) {
      return NextResponse.json({ error: "Invalid role id." }, { status: 400 });
    }

    const body = await request.json();
    const name = body.name?.toString().trim().toLowerCase() ?? "";
    const description = body.description?.toString().trim() || null;
    const permissionIds: number[] = Array.isArray(body.permissionIds)
      ? body.permissionIds.map((x: unknown) => Number(x)).filter((n: number) => !Number.isNaN(n))
      : [];

    if (!name) {
      return NextResponse.json({ error: "Role name is required." }, { status: 400 });
    }
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      return NextResponse.json(
        { error: "Role name must be lowercase letters, numbers, or underscores." },
        { status: 400 }
      );
    }

    const existing = await query<RowDataPacket[]>(
      "SELECT id, name, description FROM access_roles WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existing[0]) {
      return NextResponse.json({ error: "Role not found." }, { status: 404 });
    }
    if (isProtectedRoleName(existing[0].name) && name !== existing[0].name) {
      return NextResponse.json(
        { error: "The superadmin role name cannot be changed." },
        { status: 400 }
      );
    }
    if (isGuestRoleName(existing[0].name) && name !== existing[0].name) {
      return NextResponse.json(
        { error: "The guest role name cannot be changed." },
        { status: 400 }
      );
    }

    if (isGuestRoleName(existing[0].name)) {
      const guestValidation = await validateGuestPermissionIds(permissionIds);
      if (!guestValidation.ok) {
        return NextResponse.json({ error: guestValidation.error }, { status: 400 });
      }
    }

    if (isProtectedRoleName(existing[0].name)) {
      const critical = await query<RowDataPacket[]>(
        `SELECT id, code FROM access_permissions
         WHERE code IN (?, ?)`,
        [PERMISSIONS.adminRolesManage, PERMISSIONS.adminAccountsManage]
      );
      const missing = critical.filter((row) => !permissionIds.includes(Number(row.id)));
      if (missing.length > 0) {
        return NextResponse.json(
          {
            error:
              "Cannot remove admin.roles.manage or admin.accounts.manage from the superadmin role.",
          },
          { status: 400 }
        );
      }
    }

    const beforeLinks = await query<RowDataPacket[]>(
      "SELECT permission_id FROM access_role_permissions WHERE role_id = ?",
      [id]
    );
    const beforeIds = beforeLinks.map((row) => Number(row.permission_id));
    const changes = roleUpdateChanges({
      beforeName: String(existing[0].name),
      afterName: name,
      beforeDescription: (existing[0].description as string | null) ?? null,
      afterDescription: description,
      beforePermissions: await permissionLabels(beforeIds),
      afterPermissions: await permissionLabels(permissionIds),
    });

    await suppressLogsCenter(() =>
      withTransaction(async (conn) => {
        await conn.execute("UPDATE access_roles SET name = ?, description = ? WHERE id = ?", [
          name,
          description,
          id,
        ]);
        await conn.execute("DELETE FROM access_role_permissions WHERE role_id = ?", [id]);
        for (const permissionId of permissionIds) {
          await conn.execute(
            "INSERT INTO access_role_permissions (role_id, permission_id) VALUES (?, ?)",
            [id, permissionId]
          );
        }
      })
    );

    if (changes.length > 0) {
      await recordLogsCenter({
        module: "settings",
        action: "update",
        objectType: "role",
        objectRef: name,
        changes,
      });
    }

    if (isGuestRoleName(existing[0].name)) {
      invalidateGuestPermissionsCache();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const errno = (error as { errno?: number }).errno;
    if (errno === 1062) {
      return NextResponse.json({ error: "Role name already exists." }, { status: 409 });
    }
    console.error("PUT /api/settings/roles/[id] failed", error);
    return NextResponse.json({ error: "Failed to update role." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const gate = await requirePermission(PERMISSIONS.adminRolesManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id: idParam } = await context.params;
    const id = Number(idParam);
    if (!id) {
      return NextResponse.json({ error: "Invalid role id." }, { status: 400 });
    }

    const existing = await query<RowDataPacket[]>(
      "SELECT id, name FROM access_roles WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existing[0]) {
      return NextResponse.json({ error: "Role not found." }, { status: 404 });
    }
    if (isProtectedRoleName(existing[0].name)) {
      return NextResponse.json(
        { error: "The superadmin role cannot be deleted." },
        { status: 400 }
      );
    }
    if (isGuestRoleName(existing[0].name)) {
      return NextResponse.json(
        { error: "The guest role cannot be deleted." },
        { status: 400 }
      );
    }

    const assigned = await query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM system_users WHERE role_id = ?",
      [id]
    );
    if (Number(assigned[0]?.c ?? 0) > 0) {
      return NextResponse.json(
        { error: "Role is still assigned to one or more accounts." },
        { status: 409 }
      );
    }

    await suppressLogsCenter(() =>
      withTransaction(async (conn) => {
        await conn.execute("DELETE FROM access_role_permissions WHERE role_id = ?", [id]);
        await conn.execute("DELETE FROM access_roles WHERE id = ?", [id]);
      })
    );
    await recordLogsCenter({
      module: "settings",
      action: "delete",
      objectType: "role",
      objectRef: String(existing[0].name),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/settings/roles/[id] failed", error);
    return NextResponse.json({ error: "Failed to delete role." }, { status: 500 });
  }
}
