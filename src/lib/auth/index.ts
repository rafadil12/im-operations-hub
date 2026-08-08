import { NextResponse } from "next/server";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { accountHasPermission, guestHasPermission } from "./access";
import { getAccountPublic } from "./accounts";
import { clearSessionCookie, readSession } from "./session";
import type { AuthAccountPublic, SessionPayload } from "./types";

function agentLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
): void {
  // #region agent log
  const payload = {
    sessionId: "72cffc",
    runId: "pre-fix",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  try {
    appendFileSync(
      join(process.cwd(), "debug-72cffc.log"),
      `${JSON.stringify(payload)}\n`,
    );
  } catch {
    /* ignore */
  }
  fetch("http://127.0.0.1:7441/ingest/b0db2ec0-9a05-4761-88ea-3462e0be0a54", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "72cffc",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}

export type { AuthAccountPublic, SessionPayload } from "./types";
export {
  accountHasPermission,
  canAssignPrivilegedRoles,
  getRoleAccess,
  guestHasPermission,
  permissionsIncludeAdminManage,
  GUEST_PERMISSIONS,
  PERMISSIONS,
  type RoleAccess,
} from "./access";
export {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
} from "./password";
export {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  readSession,
  setSessionCookie,
  clearSessionCookie,
  MAX_AGE_SECONDS,
} from "./session";
export {
  authenticateLogin,
  getAccountPublic,
  loadPermissionsForRole,
  findAccountByEmployeeNo,
  findAccountBySystemUserId,
  changePassword,
  resetPassword,
} from "./accounts";
export type { ChangePasswordResult } from "./accounts";
export { MIN_PASSWORD_LENGTH } from "./constants";

async function unauthorized(): Promise<NextResponse> {
  await clearSessionCookie();
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function requireSession(): Promise<
  { session: SessionPayload; account: AuthAccountPublic } | NextResponse
> {
  const session = await readSession();
  if (!session) {
    agentLog("B-D", "auth/index.ts:requireSession", "no session cookie", {
      reason: "no_session",
    });
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const account = await getAccountPublic(session.systemUserId);
  if (!account) {
    agentLog("E", "auth/index.ts:requireSession", "account missing or inactive", {
      reason: "no_account",
      systemUserId: session.systemUserId,
      cookieSessionVersion: session.sessionVersion,
    });
    return unauthorized();
  }
  if (session.sessionVersion !== account.sessionVersion) {
    agentLog("A", "auth/index.ts:requireSession", "sessionVersion mismatch", {
      reason: "version_mismatch",
      cookieVersion: session.sessionVersion,
      dbVersion: account.sessionVersion,
      systemUserId: session.systemUserId,
    });
    return unauthorized();
  }
  return { session, account };
}

export type AuthGate = {
  session: SessionPayload | null;
  account: AuthAccountPublic | null;
};

export async function requirePermission(
  code: string,
): Promise<AuthGate | NextResponse> {
  const session = await readSession();
  if (!session) {
    if (guestHasPermission(code)) {
      return { session: null, account: null };
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const account = await getAccountPublic(session.systemUserId);
  if (!account) {
    return unauthorized();
  }
  if (session.sessionVersion !== account.sessionVersion) {
    return unauthorized();
  }
  if (!accountHasPermission(account, code)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return { session, account };
}

export async function requireAnyPermission(
  codes: string[],
): Promise<AuthGate | NextResponse> {
  const session = await readSession();
  if (!session) {
    if (codes.some((code) => guestHasPermission(code))) {
      return { session: null, account: null };
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const account = await getAccountPublic(session.systemUserId);
  if (!account) {
    return unauthorized();
  }
  if (session.sessionVersion !== account.sessionVersion) {
    return unauthorized();
  }
  const allowed = codes.some((code) => accountHasPermission(account, code));
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return { session, account };
}

export async function requireAdmin(): Promise<
  { session: SessionPayload; account: AuthAccountPublic } | NextResponse
> {
  const result = await requireSession();
  if (result instanceof NextResponse) return result;
  if (result.account.roleName !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return result;
}

export function isAdminAccount(account: AuthAccountPublic | null): boolean {
  return account?.roleName === "admin";
}
