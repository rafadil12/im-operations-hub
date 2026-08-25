"use client";

import { useMemo } from "react";
import { ModuleTabNav } from "@/components/ui/ModuleTabNav";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLang } from "@/lib/i18n";

export function ModuleTabs() {
  const { t } = useLang();
  const { canViewDailyRecords, canViewDailyAnalysis, canManageConfiguration } = useRoleAccess();

  const tabs = useMemo(() => {
    const all = [
      {
        label: t.nav.management,
        href: "/daily-operation/management",
        show: canViewDailyRecords,
      },
      {
        label: t.nav.analysis,
        href: "/daily-operation/analysis",
        show: canViewDailyAnalysis,
      },
      {
        label: t.nav.master,
        href: "/daily-operation/master/users",
        show: canManageConfiguration,
        isActive: (pathname: string) => pathname.startsWith("/daily-operation/master"),
      },
    ];
    return all
      .filter((tab) => tab.show)
      .map(({ label, href, isActive }) => ({ label, href, isActive }));
  }, [t, canViewDailyRecords, canViewDailyAnalysis, canManageConfiguration]);

  return <ModuleTabNav tabs={tabs} />;
}
