import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { nextLocationCode } from "@/lib/sparepart/locations";

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.sparepartLocationsManage);
  if (gate instanceof NextResponse) return gate;

  try {
    const code = await nextLocationCode();
    return NextResponse.json({ code });
  } catch (error) {
    console.error("GET /sparepart/storage-locations/next-code failed", error);
    return NextResponse.json({ error: "Failed to generate location code." }, { status: 500 });
  }
}
