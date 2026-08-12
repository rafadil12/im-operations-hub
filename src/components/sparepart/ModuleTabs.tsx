"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLang } from "@/lib/i18n";

export function ModuleTabs() {
  const pathname = usePathname();
  const { t } = useLang();
  const {
    canViewSparepartStock,
    canPostSparepartDocument,
    canViewSparepartDocuments,
    canViewSparepartMaterials,
    canManageSparepartLocations,
  } = useRoleAccess();

  const tabs = [
    {
      label: t.nav.sparepartStock,
      href: "/sparepart/stock",
      visible: canViewSparepartStock,
    },
    {
      label: t.nav.sparepartPost,
      href: "/sparepart/post",
      visible: canPostSparepartDocument,
    },
    {
      label: t.nav.sparepartDocuments,
      href: "/sparepart/documents",
      visible: canViewSparepartDocuments,
    },
    {
      label: t.nav.sparepartMaterials,
      href: "/sparepart/materials",
      visible: canViewSparepartMaterials,
    },
    {
      label: t.nav.sparepartLocations,
      href: "/sparepart/locations",
      visible: canManageSparepartLocations,
    },
  ].filter((tab) => tab.visible);

  if (pathname === "/sparepart" || tabs.length === 0) return null;

  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b border-border-subtle">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
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
