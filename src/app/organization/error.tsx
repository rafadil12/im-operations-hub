"use client";

import { RouteErrorFallback } from "@/components/ui/RouteErrorFallback";

export default function OrganizationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      title="Organization module error"
      message={error.message || "Failed to load the organization module."}
      reset={reset}
    />
  );
}
