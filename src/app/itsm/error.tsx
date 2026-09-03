"use client";

import { RouteErrorFallback } from "@/components/ui/RouteErrorFallback";

export default function ItsmError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      title="ITSM module error"
      message={error.message || "Failed to load the ITSM module."}
      reset={reset}
    />
  );
}
