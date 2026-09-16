"use client";

import {
  GlobalRouteErrorShell,
  RouteErrorFallback,
} from "@/components/ui/RouteErrorFallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <GlobalRouteErrorShell>
      <RouteErrorFallback
        title="Application error"
        message={error.message || "An unexpected error occurred."}
        reset={reset}
      />
    </GlobalRouteErrorShell>
  );
}
