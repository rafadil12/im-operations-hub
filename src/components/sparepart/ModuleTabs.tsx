"use client";

import { usePathname } from "next/navigation";
import { ModuleTabNav } from "@/components/ui/ModuleTabNav";
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
  ]
    .filter((tab) => tab.visible)
    .map(({ label, href }) => ({ label, href }));

  if (pathname === "/sparepart" || tabs.length === 0) return null;

  return <ModuleTabNav tabs={tabs} />;
}
