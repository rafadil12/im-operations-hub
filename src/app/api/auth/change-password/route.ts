import { NextRequest, NextResponse } from "next/server";
import {
  changePassword,
  clearSessionCookie,
  MIN_PASSWORD_LENGTH,
  requireSession,
} from "@/lib/auth";
import { recordLogsCenter, suppressLogsCenter } from "@/lib/logs-center/record";

export async function POST(request: NextRequest) {
  const gate = await requireSession();
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await request.json();
    const currentPassword = body.currentPassword?.toString() ?? "";
    const newPassword = body.newPassword?.toString() ?? "";
    const confirmPassword = body.confirmPassword?.toString() ?? "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "All password fields are required." }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match." },
        { status: 400 }
      );
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current password." },
        { status: 400 }
      );
    }

    const result = await suppressLogsCenter(() =>
      changePassword(gate.session.systemUserId, currentPassword, newPassword)
    );

    if (!result.ok) {
      if (result.code === "wrong_current") {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
      }
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await recordLogsCenter({
      module: "auth",
      action: "update",
      objectType: "session",
      changes: [{ field: "result", to: "password_changed" }],
      actorSystemUserId: gate.account.systemUserId,
      actorUserId: gate.account.id,
      actorLabel: gate.account.displayName,
    });
    await clearSessionCookie();
    return NextResponse.json({ ok: true, requireRelogin: true });
  } catch (error) {
    console.error("POST /api/auth/change-password failed", error);
    return NextResponse.json({ error: "Failed to change password." }, { status: 500 });
  }
}
