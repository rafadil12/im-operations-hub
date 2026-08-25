"use client";

import { MasterPillTabs } from "@/components/ui/MasterPillTabs";
import { useLang } from "@/lib/i18n";

export function MasterTabs() {
  const { t } = useLang();

  const tabs = [
    { label: t.nav.masterUsers, href: "/daily-operation/master/users" },
    { label: t.nav.masterCategories, href: "/daily-operation/master/categories" },
    {
      label: t.nav.masterSubcategories,
      href: "/daily-operation/master/subcategories",
    },
  ];

  return <MasterPillTabs tabs={tabs} />;
}
