import { NextResponse } from "next/server";
import { getAccountPublic, readSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ account: null });
    }
    const account = await getAccountPublic(session.systemUserId);
    return NextResponse.json({ account });
  } catch (error) {
    console.error("GET /api/auth/me failed", error);
    return NextResponse.json({ error: "Failed to load session." }, { status: 500 });
  }
}
