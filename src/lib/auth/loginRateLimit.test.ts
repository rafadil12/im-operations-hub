import { describe, expect, it } from "vitest";
import {
  clearLoginFailures,
  createLoginAttemptStore,
  isLoginRateLimited,
  LOGIN_MAX_FAILURES,
  LOGIN_MAX_IP_FAILURES,
  LOGIN_WINDOW_MS,
  loginClientKey,
  loginIpKey,
  pruneExpiredLoginAttempts,
  recordLoginFailure,
} from "@/lib/auth/loginRateLimit";

describe("loginClientKey", () => {
  it("normalizes login case and trims", () => {
    expect(loginClientKey("1.2.3.4", "  Emp01 ")).toBe("1.2.3.4|emp01");
  });

  it("falls back to unknown for empty ip", () => {
    expect(loginClientKey("", "a")).toBe("unknown|a");
    expect(loginClientKey(null, "a")).toBe("unknown|a");
  });
});

describe("login rate limit", () => {
  it("allows under the failure threshold", () => {
    const store = createLoginAttemptStore();
    const key = loginClientKey("10.0.0.1", "e1");
    const t0 = 1_000_000;

    for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i++) {
      recordLoginFailure(store, key, t0 + i);
      expect(isLoginRateLimited(store, key, t0 + i)).toBe(false);
    }
  });

  it("blocks at MAX_FAILURES until window expires", () => {
    const store = createLoginAttemptStore();
    const key = loginClientKey("10.0.0.1", "e1");
    const t0 = 1_000_000;

    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
      recordLoginFailure(store, key, t0);
    }
    expect(isLoginRateLimited(store, key, t0 + 1000)).toBe(true);

    expect(isLoginRateLimited(store, key, t0 + LOGIN_WINDOW_MS)).toBe(true);

    expect(isLoginRateLimited(store, key, t0 + LOGIN_WINDOW_MS + 1)).toBe(false);
  });

  it("blocks an IP after LOGIN_MAX_IP_FAILURES across logins", () => {
    const store = createLoginAttemptStore();
    const ipKey = loginIpKey("10.0.0.1");
    const t0 = 1_000_000;

    for (let i = 0; i < LOGIN_MAX_IP_FAILURES; i++) {
      recordLoginFailure(store, ipKey, t0);
    }
    expect(isLoginRateLimited(store, ipKey, t0, LOGIN_WINDOW_MS, LOGIN_MAX_IP_FAILURES)).toBe(true);
  });

  it("successful clear removes the account bucket", () => {
    const store = createLoginAttemptStore();
    const key = loginClientKey("10.0.0.1", "e1");
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
      recordLoginFailure(store, key, 1000);
    }
    clearLoginFailures(store, key);
    expect(isLoginRateLimited(store, key, 1000)).toBe(false);
  });

  it("isolates buckets by ip and login", () => {
    const store = createLoginAttemptStore();
    const a = loginClientKey("1.1.1.1", "userA");
    const b = loginClientKey("1.1.1.1", "userB");
    const c = loginClientKey("2.2.2.2", "userA");
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
      recordLoginFailure(store, a, 1000);
    }
    expect(isLoginRateLimited(store, a, 1000)).toBe(true);
    expect(isLoginRateLimited(store, b, 1000)).toBe(false);
    expect(isLoginRateLimited(store, c, 1000)).toBe(false);
  });

  it("resets count when recording after window expiry", () => {
    const store = createLoginAttemptStore();
    const key = loginClientKey("10.0.0.1", "e1");
    const t0 = 1_000_000;
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
      recordLoginFailure(store, key, t0);
    }
    recordLoginFailure(store, key, t0 + LOGIN_WINDOW_MS + 1);
    expect(store.get(key)?.count).toBe(1);
    expect(isLoginRateLimited(store, key, t0 + LOGIN_WINDOW_MS + 1)).toBe(false);
  });

  it("prunes expired buckets", () => {
    const store = createLoginAttemptStore();
    const key = loginClientKey("10.0.0.1", "e1");
    const t0 = 1_000_000;
    recordLoginFailure(store, key, t0);
    pruneExpiredLoginAttempts(store, t0 + LOGIN_WINDOW_MS + 1);
    expect(store.has(key)).toBe(false);
  });
});
