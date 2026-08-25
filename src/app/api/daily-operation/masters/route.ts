import { NextResponse } from "next/server";
import { PERMISSIONS, requirePermission } from "@/lib/auth";
import { loadMasters } from "@/lib/masters";

export async function GET() {
  const gate = await requirePermission(PERMISSIONS.dailyRecordRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const masters = await loadMasters();
    return NextResponse.json(masters);
  } catch (error) {
    console.error("GET /masters failed", error);
    return NextResponse.json({ error: "Failed to load master data." }, { status: 500 });
  }
}
