import { NextResponse } from "next/server";
import { loadMasters } from "@/lib/masters";

export async function GET() {
  try {
    const masters = await loadMasters();
    return NextResponse.json(masters);
  } catch (error) {
    console.error("GET /masters failed", error);
    return NextResponse.json(
      { error: "Failed to load master data." },
      { status: 500 },
    );
  }
}
