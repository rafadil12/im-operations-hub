"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";

export function MasterTabs() {
  const pathname = usePathname();
  const { t } = useLang();

  const tabs = [
    {
      label: "Technicians",
      href: "/itsm/master/technicians",
    },
    {
      label: "Groups",
      href: "/itsm/master/groups",
    },
    {
      label: "Priorities",
      href: "/itsm/master/priorities",
    },
  ];

  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const active = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-accent-soft text-text"
                : "border border-border text-text-muted hover:bg-surface-hover hover:text-text",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}