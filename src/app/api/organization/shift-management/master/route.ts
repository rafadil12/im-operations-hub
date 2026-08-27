import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await query(
      `
        SELECT
          id,
          shift_code,
          shift_name_en,
          shift_name_cn,
          TIME_FORMAT(start_time, '%H:%i') AS start_time,
          TIME_FORMAT(end_time, '%H:%i') AS end_time,
          shift_category,
          is_active
        FROM shift_masters
        WHERE is_active = 1
        ORDER BY
          CASE
            WHEN shift_category = 'ROTATION' THEN 0
            ELSE 1
          END,
          id ASC
      `,
    );

    return NextResponse.json(
      {
        success: true,
        data: rows,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load shift masters:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load shift masters.",
      },
      { status: 500 },
    );
  }
}