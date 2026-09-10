import { NextResponse } from "next/server";

export const GUEST_FORBIDDEN_MESSAGE = "Not allowed, please login." as const;
export const GUEST_FORBIDDEN_AUTH = "guest" as const;

export type GuestForbiddenPayload = {
  error: typeof GUEST_FORBIDDEN_MESSAGE;
  auth: typeof GUEST_FORBIDDEN_AUTH;
};

export function jsonGuestForbidden(): NextResponse<GuestForbiddenPayload> {
  return NextResponse.json(
    { error: GUEST_FORBIDDEN_MESSAGE, auth: GUEST_FORBIDDEN_AUTH },
    { status: 403 }
  );
}

export function isGuestForbiddenPayload(data: unknown): data is GuestForbiddenPayload {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as GuestForbiddenPayload).auth === GUEST_FORBIDDEN_AUTH
  );
}
