"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getRoleAccess } from "@/lib/auth/access";
import { useLang } from "@/lib/i18n";

type Props = {
  children: React.ReactNode;
  /** Module / page capability gate. */
  require?: "settings" | "configuration" | "roles" | "accounts";
};

export function AdminGate({ children, require = "settings" }: Props) {
  const { account, loading } = useAuth();
  const router = useRouter();
  const { t } = useLang();
  const access = getRoleAccess(account);
  const canEnter =
    require === "configuration"
      ? access.canManageConfiguration
      : require === "roles"
        ? access.canManageRoles
        : require === "accounts"
          ? access.canManageAccounts
          : access.canAccessSettings;

  useEffect(() => {
    if (loading) return;
    if (!account) {
      router.replace("/login");
      return;
    }
    if (!canEnter) {
      if (require === "roles" && access.canManageAccounts) {
        router.replace("/settings/accounts");
        return;
      }
      if (require === "accounts" && access.canManageRoles) {
        router.replace("/settings/roles");
        return;
      }
      router.replace("/");
    }
  }, [access.canManageAccounts, access.canManageRoles, account, canEnter, loading, require, router]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
        {t.common.loading}
      </div>
    );
  }

  if (!account || !canEnter) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
        {t.settings.adminOnly}
      </div>
    );
  }

  return <>{children}</>;
}
