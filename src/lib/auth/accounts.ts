import { query, execute } from "@/lib/db";
import type { AuthAccountPublic, AuthAccountRow } from "./types";

export function toPublicAccount(row: AuthAccountRow): AuthAccountPublic {
  return {
    id: row.id,
    email: row.email,
    employeeId: row.employee_id,
    displayName: row.display_name,
    roleLabel: row.role_label,
  };
}

export async function findAccountByLogin(
  login: string,
): Promise<AuthAccountRow | null> {
  const trimmed = login.trim();
  if (!trimmed) return null;

  const rows = await query<AuthAccountRow[]>(
    `SELECT id, email, employee_id, password_hash, display_name, role_label, is_active
     FROM app_accounts
     WHERE is_active = 1
       AND (LOWER(email) = LOWER(?) OR employee_id = ?)
     LIMIT 1`,
    [trimmed, trimmed],
  );

  return rows[0] ?? null;
}

export async function touchLastLogin(accountId: number): Promise<void> {
  await execute(
    "UPDATE app_accounts SET last_login_at = NOW() WHERE id = ?",
    [accountId],
  );
}
