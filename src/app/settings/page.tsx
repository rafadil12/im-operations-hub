"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { SkeletonPage } from "@/components/ui/skeletons";

export default function SettingsIndexPage() {
  const router = useRouter();
  const { canManageRoles, canManageAccounts } = useRoleAccess();

  useEffect(() => {
    if (canManageRoles) {
      router.replace("/settings/roles");
      return;
    }
    if (canManageAccounts) {
      router.replace("/settings/accounts");
      return;
    }
    router.replace("/");
  }, [canManageAccounts, canManageRoles, router]);

  return <SkeletonPage />;
}
