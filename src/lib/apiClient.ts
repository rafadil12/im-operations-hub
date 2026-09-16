import {
  GUEST_FORBIDDEN_AUTH,
  GUEST_FORBIDDEN_MESSAGE,
  isGuestForbiddenPayload,
} from "@/lib/auth/guestForbidden";

const BASES = {
  daily: "/api/daily-operation",
  itsm: "/api/itsm",
  sparepart: "/api/sparepart",
  organization: "/api/organization",
} as const;

type ModuleType = keyof typeof BASES;

/**
 * API failure that remains an Error so `instanceof Error`
 * callers keep working.
 */
export class ApiError extends Error {
  status: number;
  auth?: string;

  constructor(message: string, status: number, auth?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.auth = auth;
  }
}

let guestForbiddenHandler: (() => void) | null = null;
let clientGuestMode = true;

export function registerGuestForbiddenHandler(handler: (() => void) | null): void {
  guestForbiddenHandler = handler;
}

export function setClientGuestMode(isGuest: boolean): void {
  clientGuestMode = isGuest;
}

export function isGuestForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.auth === GUEST_FORBIDDEN_AUTH;
}

export function notifyGuestForbiddenFromPayload(
  status: number,
  data: unknown,
  method?: string
): boolean {
  if (isGuestForbiddenPayload(data)) {
    guestForbiddenHandler?.();
    return true;
  }

  if (clientGuestMode && method && method !== "GET" && (status === 401 || status === 403)) {
    guestForbiddenHandler?.();
    return true;
  }

  return false;
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Request failed.";
}

function notifyGuestForbidden(status: number, data: unknown, method?: string): void {
  if (isGuestForbiddenPayload(data)) {
    guestForbiddenHandler?.();
    return;
  }

  if (clientGuestMode && method && method !== "GET" && (status === 401 || status === 403)) {
    guestForbiddenHandler?.();
  }
}

async function handle<T>(res: Response, method?: string): Promise<T> {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const auth = (data as { auth?: string }).auth;
    const message =
      (data as { error?: string }).error ||
      (auth === GUEST_FORBIDDEN_AUTH ? GUEST_FORBIDDEN_MESSAGE : `Request failed (${res.status})`);
    notifyGuestForbidden(res.status, data, method);
    throw new ApiError(message, res.status, auth);
  }

  return data as T;
}

export async function apiGet<T>(path: string, module: ModuleType = "daily"): Promise<T> {
  const res = await fetch(`${BASES[module]}${path}`, {
    cache: "no-store",
  });

  return handle<T>(res, "GET");
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
  module: ModuleType = "daily"
): Promise<T> {
  const res = await fetch(`${BASES[module]}${path}`, {
    method,
    headers: body
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  return handle<T>(res, method);
}

/** Fetch against an absolute API path (e.g. `/api/settings/roles`). */
export async function apiGetAbs<T>(path: string, init?: { signal?: AbortSignal }): Promise<T> {
  const res = await fetch(path, { cache: "no-store", signal: init?.signal });
  return handle<T>(res, "GET");
}

/**
 * Absolute-path mutation
 * (e.g. `/api/settings/...`).
 */
export async function apiSendAbs<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  return handle<T>(res, method);
}

/** Use with raw `fetch` calls to trigger the guest login modal when applicable. */
export function handleGuestForbiddenResponse(
  status: number,
  data: unknown,
  method?: string
): boolean {
  return notifyGuestForbiddenFromPayload(status, data, method);
}
