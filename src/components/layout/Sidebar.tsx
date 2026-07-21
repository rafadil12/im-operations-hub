"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href?: string;
  icon: string;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { label: "Overview", href: "/", icon: "⊞" },
  { label: "ITSM", href: "/itsm", icon: "☎" },
  { label: "Daily Operation", href: "/daily-operation", icon: "☰" },
  { label: "Security", icon: "🛡", disabled: true },
  { label: "Sparepart", icon: "⚙", disabled: true },
  { label: "Organization", icon: "◎", disabled: true },
  { label: "Report", icon: "▤", disabled: true },
  { label: "Training", icon: "✎", disabled: true },
  { label: "Settings", icon: "⚙", disabled: true },
];

const systemStatus = [
  { label: "Server", status: "Online" },
  { label: "Network", status: "Online" },
  { label: "Database", status: "Online" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col border-r border-border bg-bg-elevated">
      <div className="border-b border-border-subtle px-4 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
          IT Operations
        </p>
        <h1 className="mt-1 text-sm font-semibold leading-snug text-text">
          Command Center
        </h1>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href
                ? pathname.startsWith(item.href)
                : false;

          const className = [
            "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
            isActive
              ? "bg-accent-soft text-text font-medium"
              : item.disabled
                ? "cursor-not-allowed text-text-dim"
                : "text-text-muted hover:bg-surface-hover hover:text-text",
          ].join(" ");

          if (item.disabled || !item.href) {
            return (
              <span key={item.label} className={className} title="Coming soon">
                <span className="w-4 text-center text-xs opacity-70">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                <span className="text-[9px] uppercase tracking-wide text-text-dim">
                  Soon
                </span>
              </span>
            );
          }

          return (
            <Link key={item.label} href={item.href} className={className}>
              <span className="w-4 text-center text-xs opacity-70">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-border-subtle p-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
            System Status
          </p>
          <ul className="space-y-1.5">
            {systemStatus.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between text-xs text-text-muted"
              >
                <span>{item.label}</span>
                <span className="flex items-center gap-1.5 text-success">
                  <span className="inline-block size-1.5 rounded-full bg-success" />
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-border-subtle bg-surface px-3 py-2.5">
          <p className="text-xs font-medium text-text">Need Help?</p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            Contact IT Support desk
          </p>
        </div>
      </div>
    </aside>
  );
}
