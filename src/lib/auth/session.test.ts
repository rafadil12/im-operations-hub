import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth/session";

const SECRET = "test-auth-secret-16chars";

describe("session token sessionVersion", () => {
  const prev = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = SECRET;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prev;
  });

  it("round-trips sessionVersion on create/verify", () => {
    const token = createSessionToken({
      systemUserId: 7,
      userId: 3,
      roleName: "admin",
      sessionVersion: 4,
      maxAgeSeconds: 3600,
    });
    const payload = verifySessionToken(token);
    expect(payload).toMatchObject({
      systemUserId: 7,
      userId: 3,
      roleName: "admin",
      sessionVersion: 4,
    });
  });

  it("treats missing sessionVersion as 0 (legacy cookies)", () => {
    const legacy = {
      systemUserId: 1,
      userId: 1,
      roleName: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const encoded = Buffer.from(JSON.stringify(legacy), "utf8").toString(
      "base64url",
    );
    const signature = createHmac("sha256", SECRET)
      .update(encoded)
      .digest("base64url");
    const payload = verifySessionToken(`${encoded}.${signature}`);
    expect(payload?.sessionVersion).toBe(0);
  });

  it("rejects tampered tokens", () => {
    const token = createSessionToken({
      systemUserId: 1,
      userId: 1,
      roleName: "admin",
      sessionVersion: 1,
    });
    const [encoded] = token.split(".");
    expect(verifySessionToken(`${encoded}.deadbeef`)).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = createSessionToken({
      systemUserId: 1,
      userId: 1,
      roleName: "admin",
      sessionVersion: 1,
      maxAgeSeconds: -10,
    });
    expect(verifySessionToken(token)).toBeNull();
  });
});
