import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type {
  Category,
  Division,
  MesStatus,
  MesType,
  Subcategory,
  User,
} from "@/lib/types";

export async function GET() {
  try {
    const [divisions, categories, subcategories, users, types, statuses] =
      await Promise.all([
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
        query<MesType[]>(
          "SELECT id, name_cn, name_en FROM mes_type ORDER BY id",
        ),
        query<MesStatus[]>(
          "SELECT id, name_cn, name_en FROM mes_status ORDER BY id",
        ),
      ]);

    return NextResponse.json({
      divisions,
      categories,
      subcategories,
      users,
      types,
      statuses,
    });
  } catch (error) {
    console.error("GET /masters failed", error);
    return NextResponse.json(
      { error: "Failed to load master data." },
      { status: 500 },
    );
  }
}
