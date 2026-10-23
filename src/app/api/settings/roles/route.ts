import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import {
  isGuestRoleName,
  isProtectedRoleName,
  PERMISSIONS,
  requireAnyPermission,
  requirePermission,
} from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { recordLogsCenter, suppressLogsCenter } from "@/lib/logs-center/record";
import { permissionListChange } from "@/lib/logs-center/roleRemark";

type RoleRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
};

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

export async function GET() {
  // Accounts UI needs role options for the assign dropdown.
  const gate = await requireAnyPermission([
    PERMISSIONS.adminRolesManage,
    PERMISSIONS.adminAccountsManage,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const roles = await query<RoleRow[]>("SELECT id, name, description FROM access_roles ORDER BY id ASC");
    const links = await query<RowDataPacket[]>(
      "SELECT role_id, permission_id FROM access_role_permissions"
    );
    const byRole = new Map<number, number[]>();
    for (const link of links) {
      const roleId = Number(link.role_id);
      const permId = Number(link.permission_id);
      const list = byRole.get(roleId) ?? [];
      list.push(permId);
      byRole.set(roleId, list);
    }

    const rows = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissionIds: byRole.get(role.id) ?? [],
    }));

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/settings/roles failed", error);
    return NextResponse.json({ error: "Failed to load roles." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.adminRolesManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await request.json();
    const name = body.name?.toString().trim().toLowerCase() ?? "";
    const description = body.description?.toString().trim() || null;
    const permissionIds: number[] = Array.isArray(body.permissionIds)
      ? body.permissionIds.map((id: unknown) => Number(id)).filter((n: number) => !Number.isNaN(n))
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
    if (isProtectedRoleName(name) || isGuestRoleName(name)) {
      return NextResponse.json(
        { error: "That role name is reserved for a system role." },
        { status: 400 }
      );
    }

    const roleId = await suppressLogsCenter(() => withTransaction(async (conn) => {
      const [result] = await conn.execute("INSERT INTO access_roles (name, description) VALUES (?, ?)", [
        name,
        description,
      ]);
      const insertId = Number((result as { insertId: number }).insertId);
      for (const permissionId of permissionIds) {
        await conn.execute("INSERT INTO access_role_permissions (role_id, permission_id) VALUES (?, ?)", [
          insertId,
          permissionId,
        ]);
      }
      return insertId;
    }));

    const permissions = permissionListChange([], await permissionLabels(permissionIds));
    await recordLogsCenter({
      module: "settings",
      action: "create",
      objectType: "role",
      objectRef: name,
      changes: permissions ? [permissions] : [],
    });

    return NextResponse.json({ id: roleId }, { status: 201 });
  } catch (error) {
    const errno = (error as { errno?: number }).errno;
    if (errno === 1062) {
      return NextResponse.json({ error: "Role name already exists." }, { status: 409 });
    }
    console.error("POST /api/settings/roles failed", error);
    return NextResponse.json({ error: "Failed to create role." }, { status: 500 });
  }
}
