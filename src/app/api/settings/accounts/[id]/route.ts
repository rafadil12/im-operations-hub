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
      return NextResponse.json({ error: "Invalid account id." }, { status: 400 });
    }

    const body = await request.json();
    const roleId =
      body.role_id === null || body.role_id === "" || body.role_id === undefined
        ? null
        : Number(body.role_id);
    const isActive =
      body.is_active === undefined ? undefined : Boolean(body.is_active);

    if (roleId !== null && Number.isNaN(roleId)) {
      return NextResponse.json({ error: "Invalid role id." }, { status: 400 });
    }

    if (roleId !== null) {
      const roles = await query<RowDataPacket[]>(
        "SELECT id FROM roles WHERE id = ? LIMIT 1",
        [roleId],
      );
      if (!roles[0]) {
        return NextResponse.json({ error: "Role not found." }, { status: 404 });
      }
    }

    // Prevent demoting/deactivating the last admin account
    const current = await query<RowDataPacket[]>(
      `SELECT su.id, su.role_id, r.name AS role_name
       FROM system_users su
       LEFT JOIN roles r ON r.id = su.role_id
       WHERE su.id = ?
       LIMIT 1`,
      [id],
    );
    if (!current[0]) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const wasAdmin = current[0].role_name === "admin";
    let nextIsAdmin = wasAdmin;
    if (roleId !== null) {
      const nextRole = await query<RowDataPacket[]>(
        "SELECT name FROM roles WHERE id = ? LIMIT 1",
        [roleId],
      );
      nextIsAdmin = nextRole[0]?.name === "admin";
    } else if (roleId === null && body.role_id !== undefined) {
      nextIsAdmin = false;
    }

    if (wasAdmin && !nextIsAdmin) {
      const adminCount = await query<RowDataPacket[]>(
        `SELECT COUNT(*) AS c
         FROM system_users su
         INNER JOIN roles r ON r.id = su.role_id
         WHERE r.name = 'admin' AND su.is_active = 1`,
      );
      if (Number(adminCount[0]?.c ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last active admin." },
          { status: 409 },
        );
      }
    }

    if (wasAdmin && isActive === false) {
      const adminCount = await query<RowDataPacket[]>(
        `SELECT COUNT(*) AS c
         FROM system_users su
         INNER JOIN roles r ON r.id = su.role_id
         WHERE r.name = 'admin' AND su.is_active = 1`,
      );
      if (Number(adminCount[0]?.c ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot deactivate the last active admin." },
          { status: 409 },
        );
      }
    }

    if (body.role_id !== undefined && isActive !== undefined) {
      await execute(
        "UPDATE system_users SET role_id = ?, is_active = ? WHERE id = ?",
        [roleId, isActive ? 1 : 0, id],
      );
    } else if (body.role_id !== undefined) {
      await execute("UPDATE system_users SET role_id = ? WHERE id = ?", [
        roleId,
        id,
      ]);
    } else if (isActive !== undefined) {
      await execute("UPDATE system_users SET is_active = ? WHERE id = ?", [
        isActive ? 1 : 0,
        id,
      ]);
    } else {
      return NextResponse.json(
        { error: "Nothing to update." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/settings/accounts/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update account." },
      { status: 500 },
    );
  }
}
