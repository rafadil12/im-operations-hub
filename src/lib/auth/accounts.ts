import type { RowDataPacket } from "mysql2";
import { query, execute } from "@/lib/db";
import type { AuthAccountPublic } from "./types";
import { hashPassword, verifyPassword } from "./password";

export type ChangePasswordResult =
  { ok: true } | { ok: false; code: "not_found" | "wrong_current" };

export type AuthenticateLoginResult =
  | { ok: true; account: AuthAccountPublic }
  | { ok: false; code: "invalid_credentials" | "inactive" };

type AccountRow = RowDataPacket & {
  system_user_id: number;
  user_id: number;
  employee_no: string | null;
  name_en: string | null;
  name_cn: string | null;
  password_hash: string;
  is_active: number;
  role_id: number | null;
  role_name: string | null;
  session_version: number;
};

function displayName(
  row: Pick<AccountRow, "user_id" | "name_en" | "name_cn" | "employee_no">
): string {
  return row.name_en || row.name_cn || row.employee_no || `User #${row.user_id}`;
}

function toPublic(row: AccountRow, permissions: string[]): AuthAccountPublic {
  const roleName = row.role_name;
  return {
    id: row.user_id,
    systemUserId: row.system_user_id,
    employeeId: row.employee_no,
    displayName: displayName(row),
    roleName,
    roleLabel: roleName ? roleName.charAt(0).toUpperCase() + roleName.slice(1) : "No role",
    permissions,
    sessionVersion: Number(row.session_version) || 1,
  };
}

const ACCOUNT_SELECT = `
  su.id AS system_user_id,
  su.user_id,
  su.password_hash,
  su.is_active,
  su.role_id,
  COALESCE(su.session_version, 1) AS session_version,
  u.employee_no,
  u.name_en,
  u.name_cn,
  r.name AS role_name
`;

export async function loadPermissionsForRole(roleId: number | null): Promise<string[]> {
  if (!roleId) return [];
  const rows = await query<RowDataPacket[]>(
    `SELECT p.code
     FROM role_permissions rp
     INNER JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ?
     ORDER BY p.code`,
    [roleId]
  );
  return rows.map((r) => String(r.code));
}

export async function findAccountByEmployeeNo(employeeNo: string): Promise<AccountRow | null> {
  const rows = await query<AccountRow[]>(
    `SELECT ${ACCOUNT_SELECT}
     FROM system_users su
     INNER JOIN users u ON u.id = su.user_id
     LEFT JOIN roles r ON r.id = su.role_id
     WHERE u.employee_no = ?
     LIMIT 1`,
    [employeeNo]
  );
  return rows[0] ?? null;
}

export async function findAccountBySystemUserId(systemUserId: number): Promise<AccountRow | null> {
  const rows = await query<AccountRow[]>(
    `SELECT ${ACCOUNT_SELECT}
     FROM system_users su
     INNER JOIN users u ON u.id = su.user_id
     LEFT JOIN roles r ON r.id = su.role_id
     WHERE su.id = ?
     LIMIT 1`,
    [systemUserId]
  );
  return rows[0] ?? null;
}

export async function getAccountPublic(systemUserId: number): Promise<AuthAccountPublic | null> {
  const row = await findAccountBySystemUserId(systemUserId);
  if (!row || !row.is_active) return null;
  const permissions = await loadPermissionsForRole(row.role_id);
  return toPublic(row, permissions);
}

export async function authenticateLogin(
  login: string,
  password: string
): Promise<AuthenticateLoginResult> {
  const employeeNo = login.trim();
  if (!employeeNo || !password) {
    return { ok: false, code: "invalid_credentials" };
  }

  const row = await findAccountByEmployeeNo(employeeNo);
  if (!row) {
    return { ok: false, code: "invalid_credentials" };
  }

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) {
    return { ok: false, code: "invalid_credentials" };
  }

  if (!row.is_active) {
    return { ok: false, code: "inactive" };
  }

  await execute("UPDATE system_users SET last_login_at = NOW() WHERE id = ?", [row.system_user_id]);

  const permissions = await loadPermissionsForRole(row.role_id);
  return { ok: true, account: toPublic(row, permissions) };
}

export async function changePassword(
  systemUserId: number,
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  const row = await findAccountBySystemUserId(systemUserId);
  if (!row || !row.is_active) return { ok: false, code: "not_found" };

  const ok = await verifyPassword(currentPassword, row.password_hash);
  if (!ok) return { ok: false, code: "wrong_current" };

  const passwordHash = await hashPassword(newPassword);
  await execute(
    `UPDATE system_users
     SET password_hash = ?, session_version = COALESCE(session_version, 1) + 1
     WHERE id = ?`,
    [passwordHash, systemUserId]
  );
  return { ok: true };
}

export async function resetPassword(systemUserId: number, newPassword: string): Promise<boolean> {
  const row = await findAccountBySystemUserId(systemUserId);
  if (!row) return false;

  const passwordHash = await hashPassword(newPassword);
  await execute(
    `UPDATE system_users
     SET password_hash = ?, session_version = COALESCE(session_version, 1) + 1
     WHERE id = ?`,
    [passwordHash, systemUserId]
  );
  return true;
}
