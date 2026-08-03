import { NextRequest, NextResponse } from "next/server";
import {
  parseGoodsMovementBody,
  postGoodsMovement,
  SparepartPostingError,
} from "@/lib/sparepartPosting";
import type { SparepartGoodsMovementInput } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<SparepartGoodsMovementInput>;
    const input = parseGoodsMovementBody(body);
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
