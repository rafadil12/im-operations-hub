import { NextResponse } from "next/server";

export const SESSION_EXPIRED_MESSAGE = "Session expired. Please sign in again." as const;
export const SESSION_EXPIRED_AUTH = "session_expired" as const;

export type SessionExpiredPayload = {
  error: typeof SESSION_EXPIRED_MESSAGE;
  auth: typeof SESSION_EXPIRED_AUTH;
};

export function jsonSessionExpired(): NextResponse<SessionExpiredPayload> {
  return NextResponse.json(
    { error: SESSION_EXPIRED_MESSAGE, auth: SESSION_EXPIRED_AUTH },
    { status: 401 }
  );
}

export function isSessionExpiredPayload(data: unknown): data is SessionExpiredPayload {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as SessionExpiredPayload).auth === SESSION_EXPIRED_AUTH
  );
}
