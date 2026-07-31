import type { AuthAccountPublic } from "./types";

export const AUTH_STORAGE_KEY = "im-ops-auth";

const DEFAULT_MOCK_ACCOUNT: Omit<AuthAccountPublic, "email" | "employeeId"> = {
  id: 1,
  displayName: "Admin",
  roleLabel: "IT Manager",
};

export function readStoredAccount(): AuthAccountPublic | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthAccountPublic>;
    if (
      typeof parsed.id !== "number" ||
      typeof parsed.email !== "string" ||
      typeof parsed.displayName !== "string" ||
      typeof parsed.roleLabel !== "string"
    ) {
      return null;
    }
    return {
      id: parsed.id,
      email: parsed.email,
      employeeId:
        typeof parsed.employeeId === "string" ? parsed.employeeId : null,
      displayName: parsed.displayName,
      roleLabel: parsed.roleLabel,
    };
  } catch {
    return null;
  }
}

export function writeStoredAccount(account: AuthAccountPublic): void {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(account));
}

export function clearStoredAccount(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

/** Mock login until DB auth is ready — any non-empty credentials succeed. */
export function createMockAccount(login: string): AuthAccountPublic {
  const trimmed = login.trim();
  const looksLikeEmail = trimmed.includes("@");
  return {
    ...DEFAULT_MOCK_ACCOUNT,
    email: looksLikeEmail ? trimmed : `${trimmed}@imone.com`,
    employeeId: looksLikeEmail ? null : trimmed,
    displayName: looksLikeEmail ? trimmed.split("@")[0] || "Admin" : trimmed,
  };
}
