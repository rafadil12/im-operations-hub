"use client";

import type { ReactNode } from "react";
import { useLang } from "@/lib/i18n";

type RouteErrorFallbackProps = {
  title: string;
  message?: string;
  reset: () => void;
  resetLabel?: string;
};

export function RouteErrorFallback({
  title,
  message,
  reset,
  resetLabel,
}: RouteErrorFallbackProps) {
  const { t } = useLang();
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-[0_12px_34px_var(--shadow-color-soft)]">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {message ? (
          <p className="mt-2 text-sm text-text-muted">{message}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400/60 hover:bg-cyan-500/15"
        >
          {resetLabel ?? t.common.tryAgain}
        </button>
      </div>
    </div>
  );
}

export function GlobalRouteErrorShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
