import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  findAccountByLogin,
  setSessionCookie,
  touchLastLogin,
  toPublicAccount,
  verifyPassword,
  SESSION_MAX_AGE_DEFAULT,
  SESSION_MAX_AGE_REMEMBER,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = body.login?.toString().trim() ?? "";
    const password = body.password?.toString() ?? "";
    const remember = Boolean(body.remember);

    if (!login || !password) {
      return NextResponse.json(
        { error: "Employee ID / email and password are required." },
        { status: 400 },
      );
    }

    const account = await findAccountByLogin(login);
    if (!account) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );
    }

    const ok = await verifyPassword(password, account.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );
    }

    const maxAge = remember
      ? SESSION_MAX_AGE_REMEMBER
      : SESSION_MAX_AGE_DEFAULT;
    const token = await createSessionToken(
      {
        sub: account.id,
        email: account.email,
        displayName: account.display_name,
        roleLabel: account.role_label,
      },
      maxAge,
    );
    await setSessionCookie(token, maxAge);
    await touchLastLogin(account.id);

    return NextResponse.json({ account: toPublicAccount(account) });
  } catch (error) {
    console.error("POST /api/auth/login failed", error);
    const message =
      error instanceof Error && error.message.includes("AUTH_SECRET")
        ? "Server auth is not configured (AUTH_SECRET)."
        : "Login failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
