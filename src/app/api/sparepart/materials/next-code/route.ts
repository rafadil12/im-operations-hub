import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { nextMaterialCode } from "@/lib/sparepart/materialCode";

export async function GET(request: NextRequest) {
  const gate = await requireAnyPermission([
    PERMISSIONS.sparepartMaterialsRead,
    PERMISSIONS.sparepartMaterialsCreate,
    PERMISSIONS.sparepartMaterialsUpdate,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const categoryId = Number(request.nextUrl.searchParams.get("category_id"));
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: "category_id is required." }, { status: 400 });
    }
    const code = await nextMaterialCode(categoryId);
    return NextResponse.json({ code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate material code.";
    const status = message === "Invalid category." ? 400 : 500;
    if (status === 500) console.error("GET /sparepart/materials/next-code failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}
