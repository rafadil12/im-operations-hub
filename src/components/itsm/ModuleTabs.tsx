"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLang } from "@/lib/i18n";

export function ModuleTabs() {
  const pathname = usePathname();
  const { t } = useLang();
  const {
    canViewItsmOverview,
    canViewItsmRequests,
    canViewItsmAnalysis,
  } = useRoleAccess();

  const tabs = useMemo(() => {
    const all = [
      {
        label: t.nav.overview,
        href: "/itsm",
        show: canViewItsmOverview,
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
    return all.filter((tab) => tab.show);
  }, [
    t,
    canViewItsmOverview,
    canViewItsmRequests,
    canViewItsmAnalysis,
  ]);

  return (
    <div className="mb-5 flex gap-2 border-b border-border-subtle">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/itsm"
            ? pathname === "/itsm"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-accent text-text"
                : "border-transparent text-text-muted hover:text-text",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
