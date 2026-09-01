import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.adminRolesManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const rows = await query<RowDataPacket[]>(
      "SELECT id, code, description FROM permissions ORDER BY code"
    );
    return NextResponse.json({
      rows: rows.map((r) => ({
        id: Number(r.id),
        code: String(r.code),
        description: (r.description as string | null) ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/settings/permissions failed", error);
    return NextResponse.json({ error: "Failed to load permissions." }, { status: 500 });
  }
}
