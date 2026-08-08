const BASES = {
  daily: "/api/daily-operation",
  itsm: "/api/itsm",
} as const;

type ModuleType = keyof typeof BASES;

export type ApiFailure = {
  message: string;
  status: number;
};

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
    const message =
      (data as { error?: string }).error || `Request failed (${res.status})`;

    // #region agent log
    fetch("http://127.0.0.1:7441/ingest/b0db2ec0-9a05-4761-88ea-3462e0be0a54", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "72cffc",
      },
      body: JSON.stringify({
        sessionId: "72cffc",
        runId: "post-fix",
        hypothesisId: "F-no-throw",
        location: "apiClient.ts:handle",
        message: "api non-ok reject without throw",
        data: { status: res.status, url: res.url, errorMessage: message },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    // Reject with a plain object (no `throw new Error`) so Next.js/Turbopack
    // dev overlay does not treat expected 401/403 as a runtime crash.
    const failure: ApiFailure = { message, status: res.status };
    return Promise.reject(failure);
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
