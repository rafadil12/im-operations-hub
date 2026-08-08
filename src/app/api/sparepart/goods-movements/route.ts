import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import {
  parseGoodsMovementBody,
  postGoodsMovement,
  SparepartPostingError,
} from "@/lib/sparepartPosting";
import type { SparepartGoodsMovementInput } from "@/lib/types";

export async function POST(request: NextRequest) {
  const gate = await requirePermission("sparepart.document.post");
  if (gate instanceof NextResponse) return gate;
  if (!gate.account) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<SparepartGoodsMovementInput>;
    const parsed = parseGoodsMovementBody(body);
    const account = gate.account;
    const creatorLabel = account.employeeId
      ? `${account.employeeId} - ${account.displayName}`
      : account.displayName;
    const input: SparepartGoodsMovementInput = {
      ...parsed,
      created_by_system_user_id: account.systemUserId,
      created_by: creatorLabel,
    };
    const result = await postGoodsMovement(input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SparepartPostingError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("POST /sparepart/goods-movements failed", error);
    return NextResponse.json(
      { error: "Failed to post goods movement." },
      { status: 500 },
    );
  }
}
