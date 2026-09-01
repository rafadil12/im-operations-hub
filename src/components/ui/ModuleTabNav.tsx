"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ModuleTabNavItem = {
  href: string;
  label: string;
  /** Custom active matcher; default: pathname.startsWith(href). */
  isActive?: (pathname: string) => boolean;
};

type Props = {
  tabs: ModuleTabNavItem[];
  /** Override the default nav container classes. */
  className?: string;
};

const DEFAULT_CLASS = "mb-5 flex flex-wrap gap-1 border-b border-border-subtle";

export function ModuleTabNav({ tabs, className = DEFAULT_CLASS }: Props) {
  const pathname = usePathname();

  return (
    <div className={className}>
      {tabs.map((tab) => {
        const isActive = tab.isActive ? tab.isActive(pathname) : pathname.startsWith(tab.href);
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
