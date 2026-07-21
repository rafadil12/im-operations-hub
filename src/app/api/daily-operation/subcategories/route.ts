import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import type { Subcategory } from "@/lib/types";

export async function GET() {
  try {
    const rows = await query<Subcategory[]>(
      "SELECT id, category_id, name_cn, name_en FROM subcategories ORDER BY name_en",
    );
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /subcategories failed", error);
    return NextResponse.json(
      { error: "Failed to load subcategories." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name_en = body.name_en?.toString().trim() || null;
    const name_cn = body.name_cn?.toString().trim() || null;
    const category_id = body.category_id ? Number(body.category_id) : null;

    if (!name_en && !name_cn) {
      return NextResponse.json(
        { error: "Name (EN or CN) is required." },
        { status: 400 },
      );
    }
    if (!category_id) {
      return NextResponse.json(
        { error: "Category is required." },
        { status: 400 },
      );
    }

    const result = await execute(
      "INSERT INTO subcategories (category_id, name_cn, name_en) VALUES (?, ?, ?)",
      [category_id, name_cn, name_en],
    );
    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (error) {
    console.error("POST /subcategories failed", error);
    return NextResponse.json(
      { error: "Failed to create subcategory." },
      { status: 500 },
    );
  }
}
