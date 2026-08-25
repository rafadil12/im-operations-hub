"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type MasterPillTab = {
  href: string;
  label: string;
};

type Props = {
  tabs: MasterPillTab[];
};

export function MasterPillTabs({ tabs }: Props) {
  const pathname = usePathname();

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
