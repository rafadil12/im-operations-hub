"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SkeletonPage } from "@/components/ui/skeletons";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import type { RoleAccess } from "@/lib/auth/access";
import { useLang } from "@/lib/i18n";

type AuthGateProps = {
  children: ReactNode;
  allow: (access: RoleAccess) => boolean;
  preset?: "table" | "dashboard" | "form";
};

export function AuthGate({ children, allow, preset = "table" }: AuthGateProps) {
  const { loading } = useAuth();
  const access = useRoleAccess();
  const { t } = useLang();

  if (loading) {
    return <SkeletonPage preset={preset} />;
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
