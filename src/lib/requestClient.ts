import { CONNECTION_IP_HEADER, normalizeClientIp } from "./connectionIp";

type HeaderSource = {
  get(name: string): string | null;
};

/**
 * Direct connections use the socket address recorded at the server.
 * TRUST_PROXY=1 reads the proxy's X-Forwarded-For or X-Real-IP instead.
 */
export function clientIp(headers: HeaderSource): string | null {
  if (process.env.TRUST_PROXY === "1") {
    const forwarded = headers.get("x-forwarded-for");
    const first = forwarded?.split(",")[0]?.trim();
    if (first) return normalizeClientIp(first);
    const realIp = headers.get("x-real-ip")?.trim();
    if (realIp) return normalizeClientIp(realIp);
    return null;
  }
  return normalizeClientIp(headers.get(CONNECTION_IP_HEADER));
}

function browserName(userAgent: string): string {
  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/Chrome\//i.test(userAgent) && !/Chromium/i.test(userAgent)) return "Chrome";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return "Safari";
  return "Web browser";
}

function platformName(userAgent: string): string | null {
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
  if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return null;
}

/** Short device label for Logs Center, for example "Chrome on Windows". */
export function deviceLabel(userAgent: string | null | undefined): string {
  const value = userAgent?.trim();
  if (!value) return "-";
  const browser = browserName(value);
  const platform = platformName(value);
  if (browser === "Web browser" && !platform) return "Web browser";
  if (!platform) return browser;
  if (browser === "Web browser") return `Web browser on ${platform}`;
  return `${browser} on ${platform}`;
}
