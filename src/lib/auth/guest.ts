import type { RowDataPacket } from "mysql2";

/** System role for unauthenticated public browse — not assignable to accounts. */
export const GUEST_ROLE_NAME = "guest";

const GUEST_CACHE_TTL_MS = 30_000;

type GuestCacheEntry = {
  permissions: string[];
  expiresAt: number;
};

let guestCache: GuestCacheEntry | null = null;

/**
 * Default read/view seed for the guest role (no export / write / admin).
 * Used by migration 043 and as documentation of the intended public baseline.
 */
export const DEFAULT_GUEST_PERMISSION_CODES = [
  "overview.view",
  "itsm.overview.view",
  "itsm.request.read",
  "itsm.analysis.view",
  "daily_operation.record.read",
  "daily_operation.analysis.view",
  "safety.overview.view",
  "safety.submission.read",
  "training.overview.view",
  "training.session.read",
  "report.overview.view",
  "report.line.read",
  "sparepart.overview.view",
  "sparepart.stock.view",
  "sparepart.document.read",
  "organization.overview.view",
  "organization.employee.read",
  "organization.shift.read",
  "organization.attendance.read",
] as const;

export function isGuestRoleName(name: string | null | undefined): boolean {
  return String(name ?? "").toLowerCase() === GUEST_ROLE_NAME;
}

/** Guest may only receive catalog codes ending in .view or .read. */
export function isGuestPermissionAllowed(code: string): boolean {
  return code.endsWith(".view") || code.endsWith(".read");
}

export function filterGuestAllowedPermissionCodes(codes: string[]): string[] {
  return codes.filter(isGuestPermissionAllowed);
}

export function invalidateGuestPermissionsCache(): void {
  guestCache = null;
}

export async function loadGuestPermissions(): Promise<string[]> {
  const now = Date.now();
  if (guestCache && guestCache.expiresAt > now) {
    return guestCache.permissions;
  }

  try {
    const { query } = await import("@/lib/db");
    const rows = await query<RowDataPacket[]>(
      `SELECT p.code
       FROM roles r
       INNER JOIN role_permissions rp ON rp.role_id = r.id
       INNER JOIN permissions p ON p.id = rp.permission_id
       WHERE r.name = ?
       ORDER BY p.code`,
      [GUEST_ROLE_NAME]
    );
    const permissions = rows.map((r) => String(r.code));
    guestCache = { permissions, expiresAt: now + GUEST_CACHE_TTL_MS };
    return permissions;
  } catch (error) {
    console.error("loadGuestPermissions failed", error);
    guestCache = { permissions: [], expiresAt: now + GUEST_CACHE_TTL_MS };
    return [];
  }
}

export async function guestHasPermissionAsync(code: string): Promise<boolean> {
  const permissions = await loadGuestPermissions();
  return permissions.includes(code);
}

export async function validateGuestPermissionIds(
  permissionIds: number[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (permissionIds.length === 0) {
    return { ok: true };
  }

  const { query } = await import("@/lib/db");
  const placeholders = permissionIds.map(() => "?").join(", ");
  const rows = await query<RowDataPacket[]>(
    `SELECT id, code FROM permissions WHERE id IN (${placeholders})`,
    permissionIds
  );

  if (rows.length !== permissionIds.length) {
    return { ok: false, error: "One or more permissions were not found." };
  }

  for (const row of rows) {
    const code = String(row.code);
    if (!isGuestPermissionAllowed(code)) {
      return {
        ok: false,
        error: `Permission "${code}" is not allowed for Guest (read/view only).`,
      };
    }
  }

  return { ok: true };
}
