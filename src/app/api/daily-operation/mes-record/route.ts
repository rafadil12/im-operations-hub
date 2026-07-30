import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { resolveRange } from "@/lib/dateRange";
import type { MesDataInput, MesDataRow } from "@/lib/types";

const LIST_SQL = `
  SELECT m.id, m.user_id, m.division_id, m.category_id, m.subcategory_id,
         m.description_cn, m.description_en, m.solution_cn, m.solution_en,
         m.type_id, m.status_id,
         m.start_time, m.end_time, m.created_at, m.updated_at,
         u.name_en AS pic_en, u.name_cn AS pic_cn,
         d.name_en AS division_en, d.name_cn AS division_cn,
         c.name_en AS category_en, c.name_cn AS category_cn,
         s.name_en AS subcategory_en, s.name_cn AS subcategory_cn,
         t.name_en AS type_en, t.name_cn AS type_cn,
         st.name_en AS status_en, st.name_cn AS status_cn
  FROM mes_record m
  LEFT JOIN users u ON m.user_id = u.id
  LEFT JOIN divisions d ON m.division_id = d.id
  LEFT JOIN categories c ON m.category_id = c.id
  LEFT JOIN subcategories s ON m.subcategory_id = s.id
  LEFT JOIN mes_type t ON m.type_id = t.id
  LEFT JOIN mes_status st ON m.status_id = st.id
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

    const statusId = sp.get("statusId");
    if (statusId) {
      conditions.push("m.status_id = ?");
      params.push(Number(statusId));
    }

    const typeId = sp.get("typeId");
    if (typeId) {
      conditions.push("m.type_id = ?");
      params.push(Number(typeId));
    }

    const q = sp.get("q");
    if (q) {
      conditions.push(
        "(m.description_cn LIKE ? OR m.description_en LIKE ? OR m.solution_cn LIKE ? OR m.solution_en LIKE ?)",
      );
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    const sql =
      LIST_SQL +
      (conditions.length ? ` AND ${conditions.join(" AND ")}` : "") +
      " ORDER BY m.start_time DESC";

    const rows = await query<MesDataRow[]>(sql, params);
    return NextResponse.json({ rows, range: { start, end } });
  } catch (error) {
    console.error("GET /mes-record failed", error);
    return NextResponse.json(
      { error: "Failed to load records." },
      { status: 500 },
    );
  }
}

function parseBody(body: Partial<MesDataInput>): MesDataInput | null {
  const description_cn = body.description_cn?.toString().trim() || "";
  const user_id = body.user_id ? Number(body.user_id) : NaN;
  const division_id = body.division_id ? Number(body.division_id) : NaN;
  const category_id = body.category_id ? Number(body.category_id) : NaN;
  const subcategory_id = body.subcategory_id
    ? Number(body.subcategory_id)
    : NaN;
  const type_id = body.type_id ? Number(body.type_id) : NaN;
  const status_id = body.status_id ? Number(body.status_id) : NaN;
  const start_time = body.start_time?.toString() || "";

  if (
    !description_cn ||
    !Number.isFinite(user_id) ||
    !Number.isFinite(division_id) ||
    !Number.isFinite(category_id) ||
    !Number.isFinite(subcategory_id) ||
    !Number.isFinite(type_id) ||
    !Number.isFinite(status_id) ||
    !start_time
  ) {
    return null;
  }

  return {
    user_id,
    division_id,
    category_id,
    subcategory_id,
    description_cn,
    description_en: body.description_en?.toString().trim() || null,
    solution_cn: body.solution_cn?.toString().trim() || null,
    solution_en: body.solution_en?.toString().trim() || null,
    type_id,
    status_id,
    start_time,
    end_time: body.end_time?.toString() || null,
  };
}
async function sendWeComNotification(content: string) {
  const webhookUrl = process.env.WECOM_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("WECOM_WEBHOOK_URL is not configured.");
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      msgtype: "markdown",
      markdown: {
        content: content,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`WeCom HTTP error: ${response.status}`);
  }

  const result = await response.json();

  if (result.errcode !== 0) {
    throw new Error(
      `WeCom error: ${result.errmsg ?? result.errcode}`,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<MesDataInput>;
    const data = parseBody(body);

    if (!data) {
      return NextResponse.json(
        {
          error:
            "User, Division, Category, Subcategory, Type, Status, Description (CN) and Start Time are required.",
        },
        { status: 400 },
      );
    }

    const result = await execute(
      `INSERT INTO mes_record
        (user_id, division_id, category_id, subcategory_id,
         description_cn, description_en, solution_cn, solution_en,
         type_id, status_id, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.division_id,
        data.category_id,
        data.subcategory_id,
        data.description_cn,
        data.description_en,
        data.solution_cn,
        data.solution_en,
        data.type_id,
        data.status_id,
        data.start_time,
        data.end_time,
      ],
    );
    try {
      const rows = await query<MesDataRow[]>(
        `SELECT
          m.*,
          u.name_en AS pic_en,
          u.name_cn AS pic_cn,
          d.name_en AS division_en,
          d.name_cn AS division_cn,
          c.name_en AS category_en,
          c.name_cn AS category_cn,
          s.name_en AS subcategory_en,
          s.name_cn AS subcategory_cn,
          t.name_en AS type_en,
          t.name_cn AS type_cn,
          st.name_en AS status_en,
          st.name_cn AS status_cn
        FROM mes_record m
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN divisions d ON m.division_id = d.id
        LEFT JOIN categories c ON m.category_id = c.id
        LEFT JOIN subcategories s ON m.subcategory_id = s.id
        LEFT JOIN mes_type t ON m.type_id = t.id
        LEFT JOIN mes_status st ON m.status_id = st.id
        WHERE m.id = ?
        LIMIT 1`,
        [result.insertId],
      );

      const record = rows[0];
      const typeColor =
      record.type_en === "Problem"
        ? "warning"
        : record.type_en === "Task"
          ? "info"
          : record.type_en === "Maintenance"
            ? "comment"
            : "info";

      if (record) {
        const start = new Date(record.start_time);
        const end = record.end_time ? new Date(record.end_time) : null;

        let duration = "-";

        if (end) {
          const diffMs = end.getTime() - start.getTime();
          const totalMinutes = Math.floor(diffMs / (1000 * 60));

          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;

          if (hours > 0 && minutes > 0) {
            duration = `${hours}h ${minutes}m`;
          } else if (hours > 0) {
            duration = `${hours}h`;
          } else {
            duration = `${minutes}m`;
          }
        }
        const message = [
          `<font color="${typeColor}">【${record.type_cn ?? "-"} ${record.type_en ? `(${record.type_en})` : ""}】</font>`,
          "-----------------------------",
          `用户 User          : ${record.pic_cn ?? "-"} ${record.pic_en ? `(${record.pic_en})` : ""}`,
          `部门 Division      : ${record.division_cn ?? "-"} ${record.division_en ? `(${record.division_en})` : ""}`,
          `时长 Duration      : ${duration}`,
          `状态 Status        : ${record.status_cn ?? "-"} ${record.status_en ? `(${record.status_en})` : ""}`,
          `类别 Category      : ${record.category_cn ?? "-"} ${record.category_en ? `(${record.category_en})` : ""}`,
          `子类别 SubCategory : ${record.subcategory_cn ?? "-"} ${record.subcategory_en ? `(${record.subcategory_en})` : ""}`,
          `问题 Problem       : ${record.description_cn ?? "-"} ${record.description_en ?? "-"}`,
          `解决方案 Solution  : ${record.solution_cn ?? "-"} ${record.solution_en ?? "-"}`,
        ].join("\n");

        await sendWeComNotification(message);
      }
    } catch (wecomError) {
      console.error("Failed to send WeCom notification:", wecomError);
    }

    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (error) {
    console.error("POST /mes-record failed", error);
    return NextResponse.json(
      { error: "Failed to create record." },
      { status: 500 },
    );
  }
}
