import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import {
  parseAndValidateMesBody,
  type MesValidationErrorKey,
} from "@/lib/daily-operation/mesRecordValidation";
import {
  isChangeRequestType,
  loadLinkedIssue,
  postChangeRequestIssue,
  saveIssueLink,
} from "@/lib/daily-operation/changeRequestIssue";
import {
  ChangeRequestIssueError,
  assertIssueComplete,
  parseChangeRequestIssue,
} from "@/lib/daily-operation/changeRequestIssueParse";
import type { AuthAccountPublic } from "@/lib/auth/types";
import {
  activityDeletedRemark,
  activityUpdatedRemark,
  goodsIssueLink,
  loadActivitySnapshot,
} from "@/lib/logs-center/activityRemark";
import { recordLogsCenter, suppressLogsCenter } from "@/lib/logs-center/record";
import { SparepartPostingError } from "@/lib/sparepart/posting";
import type { MesData, MesDataInput } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

const VALIDATION_MESSAGES: Record<MesValidationErrorKey, string> = {
  required:
    "User, Division, Category, Subcategory, Type, Status, Start Time, End Time, Description (CN/EN) and Solution (CN/EN) are required.",
  startBeforeEnd: "Start time must be before end time.",
  enHasChinese: "English fields must not contain Chinese characters.",
  cnNeedsChinese: "Chinese fields must include Chinese characters.",
  invalidDateTime: "Please enter a valid date and time.",
};

export async function GET(_req: NextRequest, ctx: Ctx) {
  const gate = await requirePermission(PERMISSIONS.dailyRecordRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await ctx.params;
    const rows = await query<MesData[]>(
      "SELECT * FROM daily_operation_record WHERE id = ? AND deleted_at IS NULL",
      [Number(id)]
    );
    if (!rows.length) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ row: rows[0] });
  } catch (error) {
    console.error("GET /mes-record/[id] failed", error);
    return NextResponse.json({ error: "Failed to load record." }, { status: 500 });
  }
}

function creatorLabel(account: AuthAccountPublic | null): string | null {
  if (!account) return null;
  return account.employeeId ? `${account.employeeId} - ${account.displayName}` : account.displayName;
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const gate = await requirePermission(PERMISSIONS.dailyRecordUpdate);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await ctx.params;
    const recordId = Number(id);
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

    const existing = await loadLinkedIssue(recordId);
    const before = await loadActivitySnapshot(recordId);
    if (!existing || !before) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const data = parsed.data;
    const linked = existing.sparepart_mat_doc_id != null;
    const typeId = linked ? existing.type_id : data.type_id;
    const issue = parseChangeRequestIssue(body);
    if (!linked && issue.issue_material) {
      if (!(await isChangeRequestType(typeId))) {
        return NextResponse.json(
          { error: "Material issue is only available for Change Request." },
          { status: 400 }
        );
      }
      assertIssueComplete(issue);
    }

    const saved = await suppressLogsCenter(async () => {
      const result = await execute(
        `UPDATE daily_operation_record SET
          user_id = ?, division_id = ?, category_id = ?, subcategory_id = ?,
          description_cn = ?, description_en = ?, solution_cn = ?, solution_en = ?,
          type_id = ?, status_id = ?, start_time = ?, end_time = ?
         WHERE id = ? AND deleted_at IS NULL`,
        [
          data.user_id,
          data.division_id,
          data.category_id,
          data.subcategory_id,
          data.description_cn,
          data.description_en,
          data.solution_cn,
          data.solution_en,
          typeId,
          data.status_id,
          data.start_time,
          data.end_time,
          recordId,
        ]
      );
      if (result.affectedRows === 0) return null;

      let docNumber: string | null = null;
      if (!linked && issue.issue_material) {
        const posted = await postChangeRequestIssue({
          recordId,
          data: { ...data, type_id: typeId },
          issue,
          createdBySystemUserId: gate.account?.systemUserId,
          createdBy: creatorLabel(gate.account),
        });
        await saveIssueLink(recordId, issue, posted.id);
        docNumber = posted.doc_number;
      }
      return { docNumber };
    });

    if (!saved) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const links =
      saved.docNumber && issue.sparepart_item_id && issue.sparepart_qty && issue.sparepart_storage_location_id
        ? [
            await goodsIssueLink({
              ref: saved.docNumber,
              qty: issue.sparepart_qty,
              itemId: issue.sparepart_item_id,
              locationId: issue.sparepart_storage_location_id,
              recipient: issue.sparepart_recipient ?? "",
            }),
          ]
        : [];
    await recordLogsCenter(
      await activityUpdatedRemark(recordId, before, { ...data, type_id: typeId }, links)
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ChangeRequestIssueError || error instanceof SparepartPostingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /mes-record/[id] failed", error);
    return NextResponse.json({ error: "Failed to update record." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const gate = await requirePermission(PERMISSIONS.dailyRecordDelete);
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await ctx.params;
    const existing = await loadLinkedIssue(Number(id));
    if (!existing) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (existing.sparepart_mat_doc_id) {
      return NextResponse.json(
        { error: "Cannot delete an activity linked to a material document." },
        { status: 409 }
      );
    }
    const result = await suppressLogsCenter(() =>
      execute(
        "UPDATE daily_operation_record SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
        [Number(id)]
      )
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    await recordLogsCenter(activityDeletedRemark(Number(id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /mes-record/[id] failed", error);
    return NextResponse.json({ error: "Failed to delete record." }, { status: 500 });
  }
}
