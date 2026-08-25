import { NextResponse } from "next/server";
import { clearSessionCookie, getAccountPublic, readSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ account: null });
    }
    const account = await getAccountPublic(session.systemUserId);
    if (!account || session.sessionVersion !== account.sessionVersion) {
      await clearSessionCookie();
      return NextResponse.json({ account: null });
    }
    return NextResponse.json({ account });
  } catch (error) {
    console.error("GET /api/auth/me failed", error);
    return NextResponse.json({ error: "Failed to load session." }, { status: 500 });
  }
}
