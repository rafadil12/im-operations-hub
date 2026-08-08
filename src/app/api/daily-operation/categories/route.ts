import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import type { Category } from "@/lib/types";

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.dailyMasterManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const rows = await query<Category[]>(
      "SELECT id, name_cn, name_en, division_id FROM categories ORDER BY name_en",
    );
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /categories failed", error);
    return NextResponse.json(
      { error: "Failed to load categories." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.dailyMasterManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await request.json();
    const name_en = body.name_en?.toString().trim() || null;
    const name_cn = body.name_cn?.toString().trim() || null;
    const division_id = body.division_id ? Number(body.division_id) : null;

    if (!name_en && !name_cn) {
      return NextResponse.json(
        { error: "Name (EN or CN) is required." },
        { status: 400 },
      );
    }

    const result = await execute(
      "INSERT INTO categories (name_cn, name_en, division_id) VALUES (?, ?, ?)",
      [name_cn, name_en, division_id],
    );
    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (error) {
    console.error("POST /categories failed", error);
    return NextResponse.json(
      { error: "Failed to create category." },
      { status: 500 },
    );
  }
}
