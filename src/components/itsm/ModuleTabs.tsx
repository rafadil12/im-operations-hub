"use client";

import { useMemo } from "react";
import { ModuleTabNav } from "@/components/ui/ModuleTabNav";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLang } from "@/lib/i18n";

export function ModuleTabs() {
  const { t } = useLang();
  const { canViewItsmOverview, canViewItsmRequests, canViewItsmAnalysis } = useRoleAccess();

  const tabs = useMemo(() => {
    const all = [
      {
        label: t.nav.overview,
        href: "/itsm",
        show: canViewItsmOverview,
        isActive: (pathname: string) => pathname === "/itsm",
      },
      {
        label: t.itsm.manageTitle,
        href: "/itsm/management",
        show: canViewItsmRequests,
      },
      {
        label: t.itsm.analysisTitle,
        href: "/itsm/analysis",
        show: canViewItsmAnalysis,
      },
    ];
    return all
      .filter((tab) => tab.show)
      .map(({ label, href, isActive }) => ({ label, href, isActive }));
  }, [t, canViewItsmOverview, canViewItsmRequests, canViewItsmAnalysis]);

  return <ModuleTabNav tabs={tabs} className="mb-5 flex gap-2 border-b border-border-subtle" />;
}
