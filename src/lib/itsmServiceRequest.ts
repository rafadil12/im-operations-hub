/**
 * Import stores TINYINT 0/1; older rows or Excel text may use true/false/yes/no/y.
 * Use these helpers so SQL and JS agree.
 */

export const IS_SERVICE_REQUEST_SQL = `(
  is_service_request IN (1, '1')
  OR LOWER(TRIM(CAST(is_service_request AS CHAR))) IN ('true', 'yes', 'y')
)`;

export function isServiceRequestValue(value: unknown): boolean {
  if (value === true || value === 1) return true;
  const s = String(value ?? "")
    .toLowerCase()
    .trim();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}
