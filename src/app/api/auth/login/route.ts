import { NextRequest, NextResponse } from "next/server";
import {
  authenticateLogin,
  createSessionToken,
  MAX_AGE_SECONDS,
  setSessionCookie,
} from "@/lib/auth";
import {
  clearLoginFailures,
  createLoginAttemptStore,
  isLoginRateLimited,
  LOGIN_MAX_IP_FAILURES,
  loginClientKey,
  loginIpKey,
  recordLoginFailure,
} from "@/lib/auth/loginRateLimit";

const loginAttempts = createLoginAttemptStore();

/**
 * Resolve client IP for rate limiting.
 * Only trust X-Forwarded-For / X-Real-IP when TRUST_PROXY=1 (behind a
 * reverse proxy that strips client-supplied forwarded headers).
 */
function clientIp(request: NextRequest): string {
  if (process.env.TRUST_PROXY === "1") {
    const forwarded = request.headers.get("x-forwarded-for");
    const first = forwarded?.split(",")[0]?.trim();
    if (first) return first;
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
  }
  return "direct";
}

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

    const ip = clientIp(request);
    const key = loginClientKey(ip, login);
    const ipKey = loginIpKey(ip);

    if (
      isLoginRateLimited(loginAttempts, key) ||
      isLoginRateLimited(
        loginAttempts,
        ipKey,
        Date.now(),
        undefined,
        LOGIN_MAX_IP_FAILURES,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Too many failed login attempts. Please try again in 15 minutes.",
        },
        { status: 429 },
      );
    }

    const account = await authenticateLogin(login, password);
    if (!account) {
      recordLoginFailure(loginAttempts, key);
      recordLoginFailure(loginAttempts, ipKey);
      return NextResponse.json(
        { error: "Invalid employee ID or password." },
        { status: 401 },
      );
    }

    clearLoginFailures(loginAttempts, key);

    const maxAgeSeconds = remember ? MAX_AGE_SECONDS : 60 * 60 * 12;
    const token = createSessionToken({
      systemUserId: account.systemUserId,
      userId: account.id,
      roleName: account.roleName,
      sessionVersion: account.sessionVersion,
      maxAgeSeconds,
    });
    await setSessionCookie(token, { maxAgeSeconds });

    return NextResponse.json({ account });
  } catch (error) {
    console.error("POST /api/auth/login failed", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
