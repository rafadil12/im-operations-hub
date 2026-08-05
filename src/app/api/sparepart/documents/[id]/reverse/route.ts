import { NextRequest, NextResponse } from "next/server";
import {
  reverseMaterialDocument,
  SparepartPostingError,
} from "@/lib/sparepartPosting";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;
    const docId = Number(id);
    if (!Number.isInteger(docId) || docId <= 0) {
      return NextResponse.json({ error: "Invalid document id." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      posting_date?: string;
      created_by?: string;
      client_request_id?: string;
    };

    const result = await reverseMaterialDocument(docId, {
      posting_date: body.posting_date,
      created_by: body.created_by,
      client_request_id: body.client_request_id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SparepartPostingError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("POST /sparepart/documents/[id]/reverse failed", error);
    return NextResponse.json(
      { error: "Failed to reverse material document." },
      { status: 500 },
    );
  }
}
