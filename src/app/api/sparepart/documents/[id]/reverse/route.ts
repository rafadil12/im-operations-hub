import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import { reverseMaterialDocument, SparepartPostingError } from "@/lib/sparepart/posting";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const gate = await requirePermission(PERMISSIONS.sparepartDocumentReverse);
  if (gate instanceof NextResponse) return gate;
  if (!gate.account) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const docId = Number(id);
    if (!Number.isInteger(docId) || docId <= 0) {
      return NextResponse.json({ error: "Invalid document id." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      posting_date?: string;
      client_request_id?: string;
    };
    const linked = await query<{ id: number }[]>(
      `SELECT id FROM daily_operation_record WHERE sparepart_mat_doc_id = ? LIMIT 1`,
      [docId]
    );
    if (linked[0]) {
      return NextResponse.json(
        { error: "This document is linked to a daily operation activity and cannot be reversed." },
        { status: 409 }
      );
    }

    const account = gate.account;
    const creatorLabel = account.employeeId
      ? `${account.employeeId} - ${account.displayName}`
      : account.displayName;

    const result = await reverseMaterialDocument(docId, {
      posting_date: body.posting_date,
      created_by_system_user_id: account.systemUserId,
      created_by: creatorLabel,
      client_request_id: body.client_request_id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SparepartPostingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /sparepart/documents/[id]/reverse failed", error);
    return NextResponse.json({ error: "Failed to reverse material document." }, { status: 500 });
  }
}
