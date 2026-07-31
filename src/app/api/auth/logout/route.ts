import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/logout failed", error);
    return NextResponse.json({ error: "Logout failed." }, { status: 500 });
  }
}
