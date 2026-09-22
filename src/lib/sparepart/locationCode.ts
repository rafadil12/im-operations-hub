/** Prefix for auto-generated storage location codes (`SL001`, `SL002`, …). */
export const LOCATION_CODE_PREFIX = "SL";

/** Parse numeric suffix of a valid `SLnnn` (or `SL` + digits) location code. */
export function parseLocationCodeSuffix(code: string): number | null {
  const upper = String(code).trim().toUpperCase();
  if (!upper.startsWith(LOCATION_CODE_PREFIX)) return null;
  const suffix = upper.slice(LOCATION_CODE_PREFIX.length);
  if (!/^\d+$/.test(suffix)) return null;
  return Number(suffix);
}

/** Next `SLnnn` from the highest existing valid location code (pure, testable). */
export function allocateNextLocationCode(existingCodes: string[]): string {
  let max = 0;
  for (const code of existingCodes) {
    const n = parseLocationCodeSuffix(code);
    if (n != null && n > max) max = n;
  }
  return `${LOCATION_CODE_PREFIX}${String(max + 1).padStart(3, "0")}`;
}
