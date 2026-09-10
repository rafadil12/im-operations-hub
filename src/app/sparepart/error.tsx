"use client";

import { RouteErrorFallback } from "@/components/ui/RouteErrorFallback";
import { fillTemplate, useLang } from "@/lib/i18n";

export default function SparepartError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLang();
  return (
    <RouteErrorFallback
      title={fillTemplate(t.common.moduleError, { module: t.nav.sparepart })}
      message={
        error.message ||
        fillTemplate(t.common.moduleLoadFailed, { module: t.nav.sparepart })
      }
      reset={reset}
    />
  );
}
