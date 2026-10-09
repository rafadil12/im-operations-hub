import { NextRequest, NextResponse } from "next/server";
import {
  authenticateLogin,
  createSessionToken,
  findAccountByEmployeeNo,
  MAX_AGE_SECONDS,
  setSessionCookie,
} from "@/lib/auth";
import { recordLogsCenter } from "@/lib/logs-center/record";
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

async function actorForTypedLogin(login: string) {
  const employeeNo = login.trim().slice(0, 255);
  const row = await findAccountByEmployeeNo(employeeNo);
  if (!row) return { actorLabel: employeeNo };
  return {
    actorSystemUserId: row.system_user_id,
    actorUserId: row.user_id,
    actorLabel: row.name_en || row.name_cn || employeeNo,
  };
}

/** Client IP for rate limiting. Trust forwarded headers only when TRUST_PROXY=1. */
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
        { status: 400 }
      );
    }

    const ip = clientIp(request);
    const key = loginClientKey(ip, login);
    const ipKey = loginIpKey(ip);

    if (
      isLoginRateLimited(loginAttempts, key) ||
      isLoginRateLimited(loginAttempts, ipKey, Date.now(), undefined, LOGIN_MAX_IP_FAILURES)
    ) {
      return NextResponse.json(
        {
          error: "Too many failed login attempts. Please try again in 15 minutes.",
        },
        { status: 429 }
      );
    }

    const result = await authenticateLogin(login, password);
    if (!result.ok) {
      if (result.code === "inactive") {
        await recordLogsCenter({
          module: "auth",
          action: "login",
          objectType: "session",
          changes: [{ field: "result", to: "inactive" }],
          ...(await actorForTypedLogin(login)),
        });
        return NextResponse.json(
          {
            error: "This account is inactive. Contact an administrator.",
            code: "inactive",
          },
          { status: 403 }
        );
      }
      recordLoginFailure(loginAttempts, key);
      recordLoginFailure(loginAttempts, ipKey);
      await recordLogsCenter({
        module: "auth",
        action: "login",
        objectType: "session",
        changes: [{ field: "result", to: "failed" }],
        ...(await actorForTypedLogin(login)),
      });
      return NextResponse.json(
        { error: "Invalid employee ID or password.", code: "invalid_credentials" },
        { status: 401 }
      );
    }

    const account = result.account;
    clearLoginFailures(loginAttempts, key);
    await recordLogsCenter({
      module: "auth",
      action: "login",
      objectType: "session",
      changes: [{ field: "result", to: "signed_in" }],
      actorSystemUserId: account.systemUserId,
      actorUserId: account.id,
      actorLabel: account.displayName,
    });

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
