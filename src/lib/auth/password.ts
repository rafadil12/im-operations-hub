import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { MIN_PASSWORD_LENGTH } from "./constants";

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}

/** Cryptographically random temporary password for admin resets (shown once). */
export function generateTemporaryPassword(byteLength = 14): string {
  const password = randomBytes(byteLength).toString("base64url");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return randomBytes(byteLength + 4).toString("base64url");
  }
  return password;
}
