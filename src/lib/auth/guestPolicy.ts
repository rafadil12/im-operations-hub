/** System role for unauthenticated public browse — not assignable to accounts. */
export const GUEST_ROLE_NAME = "guest";

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
  "sparepart.history.read",
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
