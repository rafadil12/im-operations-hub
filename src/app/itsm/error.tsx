"use client";

import { RouteErrorFallback } from "@/components/ui/RouteErrorFallback";
import { fillTemplate, useLang } from "@/lib/i18n";

export default function ItsmError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLang();
  return (
    <RouteErrorFallback
      title={fillTemplate(t.common.moduleError, { module: t.nav.itsm })}
      message={
        error.message || fillTemplate(t.common.moduleLoadFailed, { module: t.nav.itsm })
      }
      reset={reset}
    />
  );
}
