const DAILY_OP_BASE = "/api/daily-operation";

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: string }).error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${DAILY_OP_BASE}${path}`, { cache: "no-store" });
  return handle<T>(res);
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${DAILY_OP_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}

/** Fetch against an absolute API path (e.g. `/api/settings/roles`). */
export async function apiGetAbs<T>(
  path: string,
  init?: { signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(path, { cache: "no-store", signal: init?.signal });
  return handle<T>(res);
}

export async function apiSendAbs<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}
