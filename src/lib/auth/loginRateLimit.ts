/** In-memory login failure throttle (per process). */

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_MAX_IP_FAILURES = 30;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** Soft cap to avoid unbounded growth from unique login sprays. */
export const LOGIN_STORE_MAX_KEYS = 5_000;

type AttemptBucket = { count: number; firstAt: number };

export type LoginRateLimitStore = Map<string, AttemptBucket>;

export function createLoginAttemptStore(): LoginRateLimitStore {
  return new Map();
}

export function loginClientKey(ip: string | null | undefined, login: string): string {
  const safeIp = (ip ?? "unknown").trim() || "unknown";
  return `${safeIp}|${login.trim().toLowerCase()}`;
}

export function loginIpKey(ip: string | null | undefined): string {
  const safeIp = (ip ?? "unknown").trim() || "unknown";
  return `ip|${safeIp}`;
}

export function pruneExpiredLoginAttempts(
  store: LoginRateLimitStore,
  now = Date.now(),
  windowMs = LOGIN_WINDOW_MS
): void {
  for (const [key, bucket] of store) {
    if (now - bucket.firstAt > windowMs) {
      store.delete(key);
    }
  }
  if (store.size <= LOGIN_STORE_MAX_KEYS) return;
  // Drop oldest buckets first when the store is too large.
  const entries = [...store.entries()].sort((a, b) => a[1].firstAt - b[1].firstAt);
  const overflow = store.size - LOGIN_STORE_MAX_KEYS;
  for (let i = 0; i < overflow; i++) {
    const key = entries[i]?.[0];
    if (key) store.delete(key);
  }
}

export function isLoginRateLimited(
  store: LoginRateLimitStore,
  key: string,
  now = Date.now(),
  windowMs = LOGIN_WINDOW_MS,
  maxFailures = LOGIN_MAX_FAILURES
): boolean {
  const bucket = store.get(key);
  if (!bucket) return false;
  if (now - bucket.firstAt > windowMs) {
    store.delete(key);
    return false;
  }
  return bucket.count >= maxFailures;
}

export function recordLoginFailure(
  store: LoginRateLimitStore,
  key: string,
  now = Date.now(),
  windowMs = LOGIN_WINDOW_MS
): void {
  pruneExpiredLoginAttempts(store, now, windowMs);
  const bucket = store.get(key);
  if (!bucket || now - bucket.firstAt > windowMs) {
    store.set(key, { count: 1, firstAt: now });
    return;
  }
  bucket.count += 1;
}

export function clearLoginFailures(store: LoginRateLimitStore, key: string): void {
  store.delete(key);
}

export function clearLoginFailuresForIp(
  store: LoginRateLimitStore,
  ip: string | null | undefined
): void {
  const safeIp = (ip ?? "unknown").trim() || "unknown";
  const prefix = `${safeIp}|`;
  for (const key of store.keys()) {
    if (key.startsWith(prefix) || key === loginIpKey(safeIp)) {
      store.delete(key);
    }
  }
}
