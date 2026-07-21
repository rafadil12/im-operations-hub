"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Management", href: "/daily-operation/management" },
  { label: "Analysis", href: "/daily-operation/analysis" },
  { label: "Master Data", href: "/daily-operation/master/users" },
];

export function ModuleTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b border-border-subtle">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/daily-operation/master/users"
            ? pathname.startsWith("/daily-operation/master")
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
