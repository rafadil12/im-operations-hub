import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import {
  CONNECTION_IP_HEADER,
  installConnectionIpCapture,
  normalizeClientIp,
  stampConnectionIp,
} from "./connectionIp";
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

  it("ignores proxy headers when TRUST_PROXY is off", () => {
    delete process.env.TRUST_PROXY;
    expect(
      clientIp(
        headers({
          "x-forwarded-for": "203.0.113.10",
          "x-real-ip": "198.51.100.7",
          [CONNECTION_IP_HEADER]: "::ffff:172.19.8.50",
        })
      )
    ).toBe("172.19.8.50");
  });

  it("returns null when the socket address is missing", () => {
    delete process.env.TRUST_PROXY;
    expect(
      clientIp(headers({ "x-forwarded-for": "203.0.113.10", "x-real-ip": "198.51.100.7" }))
    ).toBeNull();
  });

  it("shows localhost for IPv6 loopback", () => {
    delete process.env.TRUST_PROXY;
    expect(clientIp(headers({ [CONNECTION_IP_HEADER]: "::1" }))).toBe("127.0.0.1");
    expect(clientIp(headers({ [CONNECTION_IP_HEADER]: "::ffff:127.0.0.1" }))).toBe("127.0.0.1");
  });

  it("reads the first x-forwarded-for hop when TRUST_PROXY=1", () => {
    process.env.TRUST_PROXY = "1";
    expect(
      clientIp(
        headers({
          "x-forwarded-for": "::ffff:203.0.113.10, 198.51.100.7",
          [CONNECTION_IP_HEADER]: "10.0.0.8",
        })
      )
    ).toBe("203.0.113.10");
  });

  it("falls back to x-real-ip when TRUST_PROXY=1", () => {
    process.env.TRUST_PROXY = "1";
    expect(clientIp(headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("returns null when TRUST_PROXY=1 and no proxy header is present", () => {
    process.env.TRUST_PROXY = "1";
    expect(clientIp(headers({ [CONNECTION_IP_HEADER]: "172.19.8.50" }))).toBeNull();
  });
});

describe("connection address", () => {
  it("replaces a client-supplied connection header with the socket address", () => {
    const request = {
      socket: { remoteAddress: "::ffff:172.19.8.40" },
      headers: { [CONNECTION_IP_HEADER]: "203.0.113.10" },
    };
    stampConnectionIp(request);
    expect(request.headers[CONNECTION_IP_HEADER]).toBe("::ffff:172.19.8.40");
    expect(normalizeClientIp(request.headers[CONNECTION_IP_HEADER])).toBe("172.19.8.40");
  });

  it("drops a spoofed header when the socket has no address", () => {
    const request = {
      socket: { remoteAddress: undefined },
      headers: { [CONNECTION_IP_HEADER]: "203.0.113.10" },
    };
    stampConnectionIp(request);
    expect(request.headers[CONNECTION_IP_HEADER]).toBeUndefined();
  });

  it("stamps the real socket on an HTTP request", async () => {
    const restore = installConnectionIpCapture();
    const server = createServer((req, res) => {
      const raw = req.headers[CONNECTION_IP_HEADER];
      res.end(typeof raw === "string" ? raw : "");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      const port = address && typeof address === "object" ? address.port : 0;
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        headers: { [CONNECTION_IP_HEADER]: "203.0.113.10" },
      });
      expect(normalizeClientIp(await response.text())).toBe("127.0.0.1");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
      restore();
    }
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
