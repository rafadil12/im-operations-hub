import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { requireAdmin } from "@/lib/auth";
import { execute, query } from "@/lib/db";

type RoleRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
};

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  try {
    const roles = await query<RoleRow[]>(
      "SELECT id, name, description FROM roles ORDER BY name",
    );
    const links = await query<RowDataPacket[]>(
      "SELECT role_id, permission_id FROM role_permissions",
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
  const gate = await requireAdmin();
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
        { status: 400 },
      );
    }

    const result = await execute(
      "INSERT INTO roles (name, description) VALUES (?, ?)",
      [name, description],
    );
    const roleId = result.insertId;

    for (const permissionId of permissionIds) {
      await execute(
        "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
        [roleId, permissionId],
      );
    }

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
