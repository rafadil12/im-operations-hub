import { NextResponse } from "next/server";
import { accountHasPermission, guestHasPermission } from "./access";
import { getAccountPublic } from "./accounts";
import { clearSessionCookie, readSession } from "./session";
import type { AuthAccountPublic, SessionPayload } from "./types";

export type { AuthAccountPublic, SessionPayload } from "./types";
export {
  accountHasPermission,
  canAssignPrivilegedRoles,
  getRoleAccess,
  guestHasPermission,
  isProtectedAccountEmployeeNo,
  isProtectedRoleName,
  permissionsIncludeAdminManage,
  GUEST_PERMISSIONS,
  PERMISSIONS,
  PROTECTED_ACCOUNT_EMPLOYEE_NO,
  PROTECTED_ROLE_NAME,
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
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const account = await getAccountPublic(session.systemUserId);
  if (!account) {
    return unauthorized();
  }
  if (session.sessionVersion !== account.sessionVersion) {
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
  if (
    result.account.roleName !== "admin" &&
    result.account.roleName !== "superadmin"
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return result;
}

export function isAdminAccount(account: AuthAccountPublic | null): boolean {
  return (
    account?.roleName === "admin" || account?.roleName === "superadmin"
  );
}
