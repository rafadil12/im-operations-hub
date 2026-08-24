import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import {
  SparepartImageError,
  readMaterialImageFile,
} from "@/lib/sparepartImages";

type Ctx = { params: Promise<{ filename: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
  const gate = await requireAnyPermission([
    PERMISSIONS.sparepartMaterialsRead,
    PERMISSIONS.sparepartStockView,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { filename } = await context.params;
    const decoded = decodeURIComponent(filename);
    const { buffer, contentType } = await readMaterialImageFile(decoded);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof SparepartImageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /sparepart/images/[filename] failed", error);
    return NextResponse.json(
      { error: "Failed to load image." },
      { status: 500 },
    );
  }
}
