"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLang } from "@/lib/i18n";

export default function SettingsIndexPage() {
  const router = useRouter();
  const { t } = useLang();
  const { canManageRoles, canManageAccounts, canAccessSettings } = useRoleAccess();

  useEffect(() => {
    if (canManageRoles) {
      router.replace("/settings/roles");
      return;
    }
    if (canManageAccounts) {
      router.replace("/settings/accounts");
      return;
    }
    if (canAccessSettings) {
      // settings.access alone (no roles/accounts manage) — nowhere useful to land.
      router.replace("/");
      return;
    }
    router.replace("/");
  }, [canAccessSettings, canManageAccounts, canManageRoles, router]);

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
      {t.common.loading}
    </div>
  );
}
