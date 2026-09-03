"use client";

import { RouteErrorFallback } from "@/components/ui/RouteErrorFallback";

export default function SparepartError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      title="Sparepart module error"
      message={error.message || "Failed to load the sparepart module."}
      reset={reset}
    />
  );
}
