import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { resolveRange } from "@/lib/dateRange";
import {
  parseAndValidateMesBody,
  type MesValidationErrorKey,
} from "@/lib/daily-operation/mesRecordValidation";
import {
  isChangeRequestType,
  postChangeRequestIssue,
  saveIssueLink,
} from "@/lib/daily-operation/changeRequestIssue";
import {
  ChangeRequestIssueError,
  assertIssueComplete,
  parseChangeRequestIssue,
} from "@/lib/daily-operation/changeRequestIssueParse";
import type { AuthAccountPublic } from "@/lib/auth/types";
import { SparepartPostingError } from "@/lib/sparepart/posting";
import type { MesDataInput, MesDataRow } from "@/lib/types";
import { notifyMesRecordCreated } from "@/lib/wecomNotification";

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
         st.name_en AS status_en, st.name_cn AS status_cn,
         m.sparepart_item_id, m.sparepart_qty, m.sparepart_storage_location_id,
         m.sparepart_level_id, m.sparepart_mat_doc_id,
         si.code AS sparepart_item_code,
         si.name_en AS sparepart_item_name_en, si.name_cn AS sparepart_item_name_cn,
         sloc.code AS sparepart_location_code,
         sloc.name_en AS sparepart_location_name_en, sloc.name_cn AS sparepart_location_name_cn,
         slvl.code AS sparepart_level_code,
         slvl.name_en AS sparepart_level_name_en, slvl.name_cn AS sparepart_level_name_cn,
         md.doc_number AS sparepart_doc_number,
         md.recipient AS sparepart_recipient
  FROM mes_record m
  LEFT JOIN users u ON m.user_id = u.id
  LEFT JOIN divisions d ON m.division_id = d.id
  LEFT JOIN categories c ON m.category_id = c.id
  LEFT JOIN subcategories s ON m.subcategory_id = s.id
  LEFT JOIN mes_type t ON m.type_id = t.id
  LEFT JOIN mes_status st ON m.status_id = st.id
  LEFT JOIN sparepart_items si ON si.id = m.sparepart_item_id
  LEFT JOIN sparepart_storage_locations sloc ON sloc.id = m.sparepart_storage_location_id
  LEFT JOIN sparepart_stock_levels slvl ON slvl.id = m.sparepart_level_id
  LEFT JOIN sparepart_mat_docs md ON md.id = m.sparepart_mat_doc_id
  WHERE m.deleted_at IS NULL
    AND m.start_time BETWEEN ? AND ?
`;

const VALIDATION_MESSAGES: Record<MesValidationErrorKey, string> = {
  required:
    "User, Division, Category, Subcategory, Type, Status, Start Time, End Time, Description (CN/EN) and Solution (CN/EN) are required.",
  startBeforeEnd: "Start time must be before end time.",
  enHasChinese: "English fields must not contain Chinese characters.",
  cnNeedsChinese: "Chinese fields must include Chinese characters.",
  invalidDateTime: "Please enter a valid date and time.",
};

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.dailyRecordRead);
  if (gate instanceof NextResponse) return gate;

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
      const idText = q.trim().replace(/^#/, "");
      const like = `%${q.trim()}%`;
      if (/^\d+$/.test(idText)) {
        conditions.push(
          "(m.id = ? OR m.description_cn LIKE ? OR m.description_en LIKE ? OR m.solution_cn LIKE ? OR m.solution_en LIKE ?)"
        );
        params.push(Number(idText), like, like, like, like);
      } else {
        conditions.push(
          "(m.description_cn LIKE ? OR m.description_en LIKE ? OR m.solution_cn LIKE ? OR m.solution_en LIKE ?)"
        );
        params.push(like, like, like, like);
      }
    }

    const sql =
      LIST_SQL +
      (conditions.length ? ` AND ${conditions.join(" AND ")}` : "") +
      " ORDER BY m.start_time DESC";

    const rows = await query<MesDataRow[]>(sql, params);
    return NextResponse.json({ rows, range: { start, end } });
  } catch (error) {
    console.error("GET /mes-record failed", error);
    return NextResponse.json({ error: "Failed to load records." }, { status: 500 });
  }
}

const RECORD_DETAIL_SQL = `
  SELECT
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
    st.name_cn AS status_cn,
    m.sparepart_item_id, m.sparepart_qty, m.sparepart_storage_location_id,
    m.sparepart_level_id, m.sparepart_mat_doc_id,
    si.code AS sparepart_item_code,
    si.name_en AS sparepart_item_name_en, si.name_cn AS sparepart_item_name_cn,
    sloc.code AS sparepart_location_code,
    sloc.name_en AS sparepart_location_name_en, sloc.name_cn AS sparepart_location_name_cn,
    slvl.code AS sparepart_level_code,
    slvl.name_en AS sparepart_level_name_en, slvl.name_cn AS sparepart_level_name_cn,
    md.doc_number AS sparepart_doc_number,
    md.recipient AS sparepart_recipient
  FROM mes_record m
  LEFT JOIN users u ON m.user_id = u.id
  LEFT JOIN divisions d ON m.division_id = d.id
  LEFT JOIN categories c ON m.category_id = c.id
  LEFT JOIN subcategories s ON m.subcategory_id = s.id
  LEFT JOIN mes_type t ON m.type_id = t.id
  LEFT JOIN mes_status st ON m.status_id = st.id
  LEFT JOIN sparepart_items si ON si.id = m.sparepart_item_id
  LEFT JOIN sparepart_storage_locations sloc ON sloc.id = m.sparepart_storage_location_id
  LEFT JOIN sparepart_stock_levels slvl ON slvl.id = m.sparepart_level_id
  LEFT JOIN sparepart_mat_docs md ON md.id = m.sparepart_mat_doc_id
  WHERE m.id = ?
  LIMIT 1
`;

function creatorLabel(account: AuthAccountPublic | null): string | null {
  if (!account) return null;
  return account.employeeId ? `${account.employeeId} - ${account.displayName}` : account.displayName;
}

function issueErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ChangeRequestIssueError || error instanceof SparepartPostingError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.dailyRecordCreate);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = (await request.json()) as Partial<MesDataInput>;
    const parsed = parseAndValidateMesBody(body);

    if (!parsed.ok) {
      return NextResponse.json(
        {
          error: VALIDATION_MESSAGES[parsed.messageKey],
          errors: parsed.errors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const issue = parseChangeRequestIssue(body);
    if (issue.issue_material) {
      if (!(await isChangeRequestType(data.type_id))) {
        return NextResponse.json(
          { error: "Material issue is only available for Change Request." },
          { status: 400 }
        );
      }
      assertIssueComplete(issue);
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
      ]
    );

    if (issue.issue_material) {
      try {
        const posted = await postChangeRequestIssue({
          recordId: result.insertId,
          data,
          issue,
          createdBySystemUserId: gate.account?.systemUserId,
          createdBy: creatorLabel(gate.account),
        });
        await saveIssueLink(result.insertId, issue, posted.id);
      } catch (issueError) {
        await execute("DELETE FROM mes_record WHERE id = ?", [result.insertId]);
        const response = issueErrorResponse(issueError);
        if (response) return response;
        throw issueError;
      }
    }

    try {
      const rows = await query<MesDataRow[]>(RECORD_DETAIL_SQL, [result.insertId]);
      const record = rows[0];
      if (record) {
        await notifyMesRecordCreated(record);
      }
    } catch (wecomError) {
      console.error("Failed to send WeCom notification:", wecomError);
    }

    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (error) {
    const response = issueErrorResponse(error);
    if (response) return response;
    console.error("POST /mes-record failed", error);
    return NextResponse.json({ error: "Failed to create record." }, { status: 500 });
  }
}
