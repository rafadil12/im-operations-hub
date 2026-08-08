import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { SessionPayload } from "./types";

export const SESSION_COOKIE = "im_ops_session";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a secret of at least 16 characters in .env.local",
    );
  }
  return secret;
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(encoded: string): SessionPayload | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<SessionPayload>;
    if (
      typeof parsed.systemUserId !== "number" ||
      typeof parsed.userId !== "number" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    // Pre-session_version cookies are treated as version 0 (always invalid vs DB default 1).
    const sessionVersion =
      typeof parsed.sessionVersion === "number" ? parsed.sessionVersion : 0;
    return {
      systemUserId: parsed.systemUserId,
      userId: parsed.userId,
      roleName:
        typeof parsed.roleName === "string" || parsed.roleName === null
          ? parsed.roleName
          : null,
      sessionVersion,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createSessionToken(input: {
  systemUserId: number;
  userId: number;
  roleName: string | null;
  sessionVersion: number;
  maxAgeSeconds?: number;
}): string {
  const maxAge = input.maxAgeSeconds ?? MAX_AGE_SECONDS;
  const payload: SessionPayload = {
    systemUserId: input.systemUserId,
    userId: input.userId,
    roleName: input.roleName,
    sessionVersion: input.sessionVersion,
    exp: Math.floor(Date.now() / 1000) + maxAge,
  };
  const encoded = encodePayload(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const payload = decodePayload(encoded);
  if (!payload) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}

export async function setSessionCookie(
  token: string,
  options?: { maxAgeSeconds?: number },
): Promise<void> {
  const jar = await cookies();
  const maxAge = options?.maxAgeSeconds ?? MAX_AGE_SECONDS;
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export { MAX_AGE_SECONDS };
