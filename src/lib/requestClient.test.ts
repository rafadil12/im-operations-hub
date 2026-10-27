import { afterEach, describe, expect, it } from "vitest";
import { clientIp, deviceLabel } from "./requestClient";

function headers(map: Record<string, string>) {
  return {
    get(name: string) {
      return map[name.toLowerCase()] ?? null;
    },
  };
}

describe("clientIp", () => {
  const previous = process.env.TRUST_PROXY;

  afterEach(() => {
    if (previous == null) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
  });

  it("returns null when TRUST_PROXY is off", () => {
    delete process.env.TRUST_PROXY;
    expect(
      clientIp(headers({ "x-forwarded-for": "203.0.113.10", "x-real-ip": "198.51.100.7" }))
    ).toBeNull();
  });

  it("reads the first x-forwarded-for hop when TRUST_PROXY=1", () => {
    process.env.TRUST_PROXY = "1";
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.10, 198.51.100.7" }))).toBe(
      "203.0.113.10"
    );
  });

  it("falls back to x-real-ip when TRUST_PROXY=1", () => {
    process.env.TRUST_PROXY = "1";
    expect(clientIp(headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });
});

describe("deviceLabel", () => {
  it("returns a dash for empty values", () => {
    expect(deviceLabel(null)).toBe("-");
    expect(deviceLabel("")).toBe("-");
  });

  it("names common browsers and platforms", () => {
    expect(
      deviceLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
      )
    ).toBe("Chrome on Windows");
    expect(
      deviceLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0"
      )
    ).toBe("Edge on Windows");
    expect(
      deviceLabel(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe("Safari on iOS");
  });

  it("falls back to Web browser", () => {
    expect(deviceLabel("CustomAgent/1.0")).toBe("Web browser");
  });
});
