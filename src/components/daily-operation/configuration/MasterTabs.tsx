"use client";

import { MasterPillTabs } from "@/components/ui/MasterPillTabs";
import { useLang } from "@/lib/i18n";

export function MasterTabs() {
  const { t } = useLang();

  const tabs = [
    { label: t.nav.masterUsers, href: "/daily-operation/configuration/users" },
    { label: t.nav.masterCategories, href: "/daily-operation/configuration/categories" },
    {
      label: t.nav.masterSubcategories,
      href: "/daily-operation/configuration/subcategories",
    },
  ];

  return <MasterPillTabs tabs={tabs} />;
}
