import { describe, expect, it } from "vitest";
import {
  isSessionExpiredPayload,
  SESSION_EXPIRED_AUTH,
  SESSION_EXPIRED_MESSAGE,
} from "./sessionExpired";

describe("isSessionExpiredPayload", () => {
  it("accepts session_expired auth marker", () => {
    expect(
      isSessionExpiredPayload({ error: SESSION_EXPIRED_MESSAGE, auth: SESSION_EXPIRED_AUTH })
    ).toBe(true);
  });

  it("rejects guest and plain errors", () => {
    expect(isSessionExpiredPayload({ error: "Unauthorized.", auth: "guest" })).toBe(false);
    expect(isSessionExpiredPayload({ error: "Unauthorized." })).toBe(false);
    expect(isSessionExpiredPayload(null)).toBe(false);
    expect(isSessionExpiredPayload("x")).toBe(false);
  });
});
