"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getRoleAccess } from "@/lib/auth/access";
import { useLang } from "@/lib/i18n";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { account, loading } = useAuth();
  const router = useRouter();
  const { t } = useLang();
  const { canAccessSettings } = getRoleAccess(account);

  useEffect(() => {
    if (loading) return;
    if (!account) {
      router.replace("/login");
      return;
    }
    if (!canAccessSettings) {
      router.replace("/");
    }
  }, [account, canAccessSettings, loading, router]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
        {t.common.loading}
      </div>
    );
  }

  if (!account || !canAccessSettings) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
        {t.settings.adminOnly}
      </div>
    );
  }

  return <>{children}</>;
}
