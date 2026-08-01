import { NextRequest, NextResponse } from "next/server";
import {
  authenticateLogin,
  createSessionToken,
  MAX_AGE_SECONDS,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = body.login?.toString() ?? "";
    const password = body.password?.toString() ?? "";
    const remember = Boolean(body.remember);

    if (!login.trim() || !password) {
      return NextResponse.json(
        { error: "Employee ID and password are required." },
        { status: 400 },
      );
    }

    const account = await authenticateLogin(login, password);
    if (!account) {
      return NextResponse.json(
        { error: "Invalid employee ID or password." },
        { status: 401 },
      );
    }

    const maxAgeSeconds = remember ? MAX_AGE_SECONDS : 60 * 60 * 12;
    const token = createSessionToken({
      systemUserId: account.systemUserId,
      userId: account.id,
      roleName: account.roleName,
      maxAgeSeconds,
    });
    await setSessionCookie(token, { maxAgeSeconds });

    return NextResponse.json({ account });
  } catch (error) {
    console.error("POST /api/auth/login failed", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
