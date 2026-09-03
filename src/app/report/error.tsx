"use client";

import { RouteErrorFallback } from "@/components/ui/RouteErrorFallback";

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      title="Report module error"
      message={error.message || "Failed to load the report module."}
      reset={reset}
    />
  );
}
