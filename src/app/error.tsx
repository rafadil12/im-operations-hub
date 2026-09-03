"use client";

import { RouteErrorFallback } from "@/components/ui/RouteErrorFallback";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      title="Something went wrong"
      message={error.message || "An unexpected error occurred."}
      reset={reset}
    />
  );
}
