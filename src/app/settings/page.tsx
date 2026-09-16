"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { SkeletonPage } from "@/components/ui/skeletons";

export default function SettingsIndexPage() {
  const router = useRouter();
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

  return <SkeletonPage />;
}
