import { NextResponse } from "next/server";
import { recordLogsCenter } from "@/lib/logs-center/record";
import { clearSessionCookie, readSession } from "@/lib/auth";

export async function POST() {
  try {
    const session = await readSession();
    await clearSessionCookie();
    await recordLogsCenter({
      module: "auth",
      action: "logout",
      objectType: "session",
      changes: [{ field: "result", to: "signed_out" }],
      actorSystemUserId: session?.systemUserId ?? null,
      actorUserId: session?.userId ?? null,
      actorLabel: session?.roleName ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/logout failed", error);
    return NextResponse.json({ error: "Logout failed." }, { status: 500 });
  }
}
