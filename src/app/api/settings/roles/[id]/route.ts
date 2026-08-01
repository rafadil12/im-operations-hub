import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { requireAdmin } from "@/lib/auth";
import { execute, query } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: Ctx) {
  const gate = await requireAdmin();
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
        { status: 400 },
      );
    }

    // Prevent renaming the last admin away from "admin" if this is the admin role
    const existing = await query<RowDataPacket[]>(
      "SELECT id, name FROM roles WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existing[0]) {
      return NextResponse.json({ error: "Role not found." }, { status: 404 });
    }
    if (existing[0].name === "admin" && name !== "admin") {
      return NextResponse.json(
        { error: "The admin role name cannot be changed." },
        { status: 400 },
      );
    }

    await execute("UPDATE roles SET name = ?, description = ? WHERE id = ?", [
      name,
      description,
      id,
    ]);
    await execute("DELETE FROM role_permissions WHERE role_id = ?", [id]);
    for (const permissionId of permissionIds) {
      await execute(
        "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
        [id, permissionId],
      );
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
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  try {
    const { id: idParam } = await context.params;
    const id = Number(idParam);
    if (!id) {
      return NextResponse.json({ error: "Invalid role id." }, { status: 400 });
    }

    const existing = await query<RowDataPacket[]>(
      "SELECT id, name FROM roles WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existing[0]) {
      return NextResponse.json({ error: "Role not found." }, { status: 404 });
    }
    if (existing[0].name === "admin") {
      return NextResponse.json(
        { error: "The admin role cannot be deleted." },
        { status: 400 },
      );
    }

    const assigned = await query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM system_users WHERE role_id = ?",
      [id],
    );
    if (Number(assigned[0]?.c ?? 0) > 0) {
      return NextResponse.json(
        { error: "Role is still assigned to one or more accounts." },
        { status: 409 },
      );
    }

    await execute("DELETE FROM role_permissions WHERE role_id = ?", [id]);
    await execute("DELETE FROM roles WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/settings/roles/[id] failed", error);
    return NextResponse.json({ error: "Failed to delete role." }, { status: 500 });
  }
}
