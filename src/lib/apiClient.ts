const BASES = {
  daily: "/api/daily-operation",
  itsm: "/api/itsm",
  sparepart: "/api/sparepart",
} as const;

type ModuleType = keyof typeof BASES;

/** API failure that remains an Error so `instanceof Error` callers keep working. */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
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

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = (data as { error?: string }).error || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export async function apiGet<T>(path: string, module: ModuleType = "daily"): Promise<T> {
  const res = await fetch(`${BASES[module]}${path}`, {
    cache: "no-store",
  });

  return handle<T>(res);
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

  return handle<T>(res);
}

/** Fetch against an absolute API path (e.g. `/api/settings/roles`). */
export async function apiGetAbs<T>(path: string, init?: { signal?: AbortSignal }): Promise<T> {
  const res = await fetch(path, { cache: "no-store", signal: init?.signal });
  return handle<T>(res);
}

/** Absolute-path mutation (e.g. `/api/settings/...`). */
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

  return handle<T>(res);
}
