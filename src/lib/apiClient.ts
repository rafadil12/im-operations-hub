const BASES = {
  daily: "/api/daily-operation",
  itsm: "/api/itsm",
} as const;

type ModuleType = keyof typeof BASES;

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      (data as { error?: string }).error || `Request failed (${res.status})`;

    throw new Error(message);
  }

  return data as T;
}

export async function apiGet<T>(
  path: string,
  module: ModuleType = "daily",
): Promise<T> {
  const res = await fetch(`${BASES[module]}${path}`, {
    cache: "no-store",
  });

  return handle<T>(res);
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
  module: ModuleType = "daily",
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

/** Absolute-path GET (e.g. `/api/settings/...`). */
export async function apiGetAbs<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  return handle<T>(res);
}

/** Absolute-path mutation (e.g. `/api/settings/...`). */
export async function apiSendAbs<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
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
