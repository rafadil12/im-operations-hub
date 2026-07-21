import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { resolveRange } from "@/lib/dateRange";
import type { MesDataInput, MesDataRow } from "@/lib/types";

const LIST_SQL = `
  SELECT m.id, m.user_id, m.division_id, m.category_id, m.subcategory_id,
         m.description, m.solution, m.type, m.status,
         m.start_time, m.end_time, m.created_at,
         u.name_en AS pic, d.name_en AS division,
         c.name_en AS category, s.name_en AS subcategory
  FROM mes_data m
  LEFT JOIN users u ON m.user_id = u.id
  LEFT JOIN divisions d ON m.division_id = d.id
  LEFT JOIN categories c ON m.category_id = c.id
  LEFT JOIN subcategories s ON m.subcategory_id = s.id
  WHERE m.deleted_at IS NULL
    AND m.start_time BETWEEN ? AND ?
`;

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const { start, end } = resolveRange(sp.get("start"), sp.get("end"));

    const conditions: string[] = [];
    const params: unknown[] = [start, end];

    const divisionId = sp.get("divisionId");
    if (divisionId) {
      conditions.push("m.division_id = ?");
      params.push(Number(divisionId));
    }

    const status = sp.get("status");
    if (status) {
      conditions.push("m.status = ?");
      params.push(status);
    }

    const type = sp.get("type");
    if (type) {
      conditions.push("m.type = ?");
      params.push(type);
    }

    const q = sp.get("q");
    if (q) {
      conditions.push("(m.description LIKE ? OR m.solution LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }

    const sql =
      LIST_SQL +
      (conditions.length ? ` AND ${conditions.join(" AND ")}` : "") +
      " ORDER BY m.start_time DESC";

    const rows = await query<MesDataRow[]>(sql, params);
    return NextResponse.json({ rows, range: { start, end } });
  } catch (error) {
    console.error("GET /mes-data failed", error);
    return NextResponse.json(
      { error: "Failed to load records." },
      { status: 500 },
    );
  }
}

function parseBody(body: Partial<MesDataInput>): MesDataInput {
  return {
    user_id: body.user_id ? Number(body.user_id) : null,
    division_id: body.division_id ? Number(body.division_id) : null,
    category_id: body.category_id ? Number(body.category_id) : null,
    subcategory_id: body.subcategory_id ? Number(body.subcategory_id) : null,
    description: body.description?.toString().trim() || null,
    solution: body.solution?.toString().trim() || null,
    type: body.type?.toString() || null,
    status: body.status?.toString() || null,
    start_time: body.start_time?.toString() || null,
    end_time: body.end_time?.toString() || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<MesDataInput>;
    const data = parseBody(body);

    if (!data.division_id || !data.status || !data.start_time) {
      return NextResponse.json(
        { error: "Division, Status and Start Time are required." },
        { status: 400 },
      );
    }

    const result = await execute(
      `INSERT INTO mes_data
        (user_id, division_id, category_id, subcategory_id,
         description, solution, type, status, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.division_id,
        data.category_id,
        data.subcategory_id,
        data.description,
        data.solution,
        data.type,
        data.status,
        data.start_time,
        data.end_time,
      ],
    );

    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (error) {
    console.error("POST /mes-data failed", error);
    return NextResponse.json(
      { error: "Failed to create record." },
      { status: 500 },
    );
  }
}
