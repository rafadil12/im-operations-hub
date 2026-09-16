"use client";

import { RouteErrorFallback } from "@/components/ui/RouteErrorFallback";
import { useLang } from "@/lib/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLang();
  return (
    <RouteErrorFallback
      title={t.common.error}
      message={error.message || t.common.unexpectedError}
      reset={reset}
    />
  );
}
