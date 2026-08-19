import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type UserRow = {
  id: number;
  employee_no: string | null;
  name_cn: string | null;
  name_en: string | null;
  division_id: number | null;
};

export async function GET() {
  try {
    const users = await query<UserRow[]>(
      `
        SELECT
          id,
          employee_no,
          name_cn,
          name_en,
          division_id
        FROM users
        WHERE employee_no IS NOT NULL
           OR name_en IS NOT NULL
           OR name_cn IS NOT NULL
        ORDER BY employee_no ASC
      `,
    );

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("GET /api/safety/users failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load users.",
      },
      { status: 500 },
    );
  }
}