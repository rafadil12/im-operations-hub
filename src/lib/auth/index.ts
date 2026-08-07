import { NextResponse } from "next/server";
import { getAccountPublic } from "./accounts";
import { readSession } from "./session";
import type { AuthAccountPublic, SessionPayload } from "./types";

export type { AuthAccountPublic, SessionPayload } from "./types";
export { getRoleAccess, type RoleAccess } from "./access";
export { hashPassword, verifyPassword } from "./password";
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
export { DEFAULT_PASSWORD, MIN_PASSWORD_LENGTH } from "./constants";

export async function requireSession(): Promise<
  { session: SessionPayload; account: AuthAccountPublic } | NextResponse
> {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const account = await getAccountPublic(session.systemUserId);
  if (!account) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
