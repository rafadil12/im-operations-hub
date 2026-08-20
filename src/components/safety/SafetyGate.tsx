"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import type { RoleAccess } from "@/lib/auth/access";
import { useLang } from "@/lib/i18n";

type Props = {
  children: ReactNode;
  allow: (access: RoleAccess) => boolean;
};

/** Client gate for safety pages — shows a soft message when denied. */
export function SafetyGate({ children, allow }: Props) {
  const { loading } = useAuth();
  const access = useRoleAccess();
  const { t } = useLang();

  if (loading) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
        {t.common.loading}
      </div>
    );
  }

  if (!allow(access)) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
        {t.settings.adminOnly}
      </div>
    );
  }

  return <>{children}</>;
}
