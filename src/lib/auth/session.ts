import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_DEFAULT,
  type SessionPayload,
} from "./types";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is missing. Set a long random string in .env.local.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload,
  maxAgeSeconds: number,
): Promise<string> {
  return new SignJWT({
    email: payload.email,
    displayName: payload.displayName,
    roleLabel: payload.roleLabel,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const sub = Number(payload.sub);
    if (!Number.isFinite(sub) || sub <= 0) return null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const displayName =
      typeof payload.displayName === "string" ? payload.displayName : null;
    const roleLabel =
      typeof payload.roleLabel === "string" ? payload.roleLabel : null;
    if (!email || !displayName || !roleLabel) return null;
    return { sub, email, displayName, roleLabel };
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  token: string,
  maxAgeSeconds: number,
): Promise<void> {
  const jar = await cookies();
  jar.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export { SESSION_MAX_AGE_DEFAULT };
