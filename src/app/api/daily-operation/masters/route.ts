import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type {
  Category,
  Division,
  Subcategory,
  User,
} from "@/lib/types";

export async function GET() {
  try {
    const [divisions, categories, subcategories, users] = await Promise.all([
      query<Division[]>(
        "SELECT id, name_cn, name_en FROM divisions ORDER BY id",
      ),
      query<Category[]>(
        "SELECT id, name_cn, name_en, division_id FROM categories ORDER BY name_en",
      ),
      query<Subcategory[]>(
        "SELECT id, category_id, name_cn, name_en FROM subcategories ORDER BY name_en",
      ),
      query<User[]>(
        "SELECT id, name_cn, name_en, division_id FROM users ORDER BY name_en",
      ),
    ]);

    return NextResponse.json({ divisions, categories, subcategories, users });
  } catch (error) {
    console.error("GET /masters failed", error);
    return NextResponse.json(
      { error: "Failed to load master data." },
      { status: 500 },
    );
  }
}
