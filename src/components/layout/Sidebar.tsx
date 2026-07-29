"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type NavChild = {
  label: string;
  href?: string;
  disabled?: boolean;
};

type NavItem = {
  label: string;
  href?: string;
  icon: string;
  disabled?: boolean;
  children?: NavChild[];
};

const comingSoonChildren: NavChild[] = [
  { label: "Management", disabled: true },
  { label: "Analysis", disabled: true },
  { label: "Master Data", disabled: true },
];

const navItems: NavItem[] = [
  { label: "Overview", href: "/", icon: "⊞" },
  {
    label: "ITSM",
    icon: "☎",
    children: [
      { label: "Overview", href: "/itsm" },
      { label: "Management", disabled: true },
      { label: "Analysis", disabled: true },
      { label: "Master Data", disabled: true },
    ],
  },
  {
    label: "Daily Operation",
    icon: "▤",
    children: [
      { label: "Management", href: "/daily-operation/management" },
      { label: "Analysis", href: "/daily-operation/analysis" },
      { label: "Master Data", href: "/daily-operation/master/users" },
    ],
  },
  {
    label: "Security",
    icon: "🛡",
    disabled: true,
    children: comingSoonChildren,
  },
  {
    label: "Sparepart",
    icon: "⚙",
    disabled: true,
    children: comingSoonChildren,
  },
  {
    label: "Organization",
    icon: "◎",
    disabled: true,
    children: comingSoonChildren,
  },
  { label: "Report", icon: "▤", disabled: true, children: comingSoonChildren },
  { label: "Training", icon: "✎", disabled: true, children: comingSoonChildren },
  { label: "Settings", icon: "⚙", disabled: true, children: comingSoonChildren },
];

// Survives AppShell remounts during client-side navigations.
let cachedOpenMenus: Record<string, boolean> = {};
let cachedCollapsed = false;

function isChildActive(pathname: string, child: NavChild) {
  if (!child.href) return false;
  if (child.href === "/daily-operation/master/users") {
    return pathname.startsWith("/daily-operation/master");
  }
  return pathname.startsWith(child.href);
}

function isParentActive(pathname: string, item: NavItem) {
  if (item.children?.length) {
    return item.children.some((child) => isChildActive(pathname, child));
  }
  if (item.href === "/") return pathname === "/";
  if (item.href) return pathname.startsWith(item.href);
  return false;
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(cachedCollapsed);
  const [openMenus, setOpenMenus] = useState(cachedOpenMenus);
  const [flyoutKey, setFlyoutKey] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const flyoutRef = useRef<HTMLDivElement | null>(null);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      cachedCollapsed = next;
      return next;
    });
    setFlyoutKey(null);
  };

  const updateOpenMenus = (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>,
  ) => {
    setOpenMenus((prev) => {
      const next = updater(prev);
      cachedOpenMenus = next;
      return next;
    });
  };

  // Flyout uses fixed positioning so the scrollable nav cannot clip it.
  const syncFlyoutPos = useCallback((key: string) => {
    const rect = triggerRefs.current[key]?.getBoundingClientRect();
    if (!rect) return;
    const childCount =
      navItems.find((item) => item.label === key)?.children?.length ?? 0;
    const height = flyoutRef.current?.offsetHeight ?? childCount * 40 + 12;
    const top = Math.min(
      rect.top,
      Math.max(8, window.innerHeight - height - 8),
    );
    setFlyoutPos({ top, left: rect.right + 8 });
  }, []);

  useEffect(() => {
    if (!flyoutKey) return;

    const sync = () => syncFlyoutPos(flyoutKey);
    sync();

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        flyoutRef.current?.contains(target) ||
        triggerRefs.current[flyoutKey]?.contains(target)
      ) {
        return;
      }
      setFlyoutKey(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFlyoutKey(null);
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [flyoutKey, syncFlyoutPos]);

  const itemClass = (active: boolean, disabled?: boolean) =>
    [
      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
      collapsed ? "justify-center px-2" : "",
      active
        ? "bg-accent font-medium text-white"
        : disabled
          ? "text-text-dim hover:bg-surface-hover"
          : "text-text-muted hover:bg-surface-hover hover:text-text",
    ].join(" ");

  const childClass = (active: boolean, disabled?: boolean) =>
    [
      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
      active
        ? "bg-accent font-medium text-white"
        : disabled
          ? "cursor-not-allowed text-text-dim"
          : "text-text-muted hover:bg-surface-hover hover:text-text",
    ].join(" ");

  const renderChild = (
    child: NavChild,
    active: boolean,
    parentLabel: string,
  ) => {
    if (child.disabled || !child.href) {
      return (
        <span
          key={child.label}
          className={childClass(false, true)}
          title="Coming soon"
        >
          <span className="flex-1 truncate">{child.label}</span>
          <span className="text-[9px] uppercase tracking-wide text-text-dim">
            Soon
          </span>
        </span>
      );
    }

    return (
      <Link
        key={child.href}
        href={child.href}
        onClick={() => {
          setFlyoutKey(null);
          // Keep this parent open; never close other expanded menus.
          updateOpenMenus((prev) => ({ ...prev, [parentLabel]: true }));
        }}
        className={childClass(active)}
      >
        <span className="flex-1 truncate">{child.label}</span>
      </Link>
    );
  };

  return (
    <aside
      className={[
        "relative flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-bg-elevated transition-[width] duration-300 ease-in-out",
        collapsed
          ? "w-[var(--sidebar-collapsed-width)]"
          : "w-[var(--sidebar-width)]",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-[var(--topbar-height)] shrink-0 items-center border-b border-border-subtle transition-all duration-300 ease-in-out",
          collapsed ? "justify-center px-2" : "justify-between gap-2 px-4",
        ].join(" ")}
      >
        <div
          className={[
            "min-w-0 overflow-hidden transition-all duration-300 ease-in-out",
            collapsed
              ? "pointer-events-none max-w-0 flex-none opacity-0"
              : "max-w-[180px] flex-1 opacity-100",
          ].join(" ")}
        >
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
            IM Operations Hub
          </p>
          <h1 className="mt-1 truncate text-sm font-semibold leading-snug text-text">
            Command Center
          </h1>
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="shrink-0 rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          <span aria-hidden className="block text-base leading-none">
            ☰
          </span>
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const active = isParentActive(pathname, item);

          if (item.children?.length) {
            const menuOpen = openMenus[item.label] ?? active;
            const showAccordion = !collapsed && menuOpen;
            const showFlyout = collapsed && flyoutKey === item.label;
            const parentHighlighted = collapsed ? active : menuOpen || active;

            return (
              <div key={item.label} className="relative">
                <button
                  type="button"
                  ref={(node) => {
                    triggerRefs.current[item.label] = node;
                  }}
                  onClick={() => {
                    if (collapsed) {
                      setFlyoutKey((prev) =>
                        prev === item.label ? null : item.label,
                      );
                      return;
                    }
                    updateOpenMenus((prev) => ({
                      ...prev,
                      [item.label]: !(prev[item.label] ?? active),
                    }));
                  }}
                  className={[
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-200",
                    collapsed ? "justify-center px-2" : "",
                    parentHighlighted
                      ? collapsed
                        ? "bg-accent font-medium text-white"
                        : "bg-accent-soft font-medium text-text"
                      : item.disabled
                        ? "text-text-dim hover:bg-surface-hover"
                        : "text-text-muted hover:bg-surface-hover hover:text-text",
                  ].join(" ")}
                  aria-expanded={collapsed ? showFlyout : menuOpen}
                  title={collapsed ? item.label : undefined}
                >
                  <span
                    className={[
                      "w-4 shrink-0 text-center text-xs transition-opacity duration-200",
                      parentHighlighted ? "opacity-100" : "opacity-70",
                    ].join(" ")}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={[
                      "flex min-w-0 flex-1 items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out",
                      collapsed
                        ? "max-w-0 opacity-0"
                        : "max-w-[200px] opacity-100",
                    ].join(" ")}
                  >
                    <span className="flex-1 truncate whitespace-nowrap">
                      {item.label}
                    </span>
                    {item.disabled && (
                      <span className="shrink-0 text-[9px] uppercase tracking-wide text-text-dim">
                        Soon
                      </span>
                    )}
                    <span
                      className={[
                        "shrink-0 text-[18px] text-text-dim transition-transform duration-300 ease-in-out",
                        menuOpen ? "rotate-180" : "rotate-0",
                      ].join(" ")}
                      aria-hidden
                    >
                      ▾
                    </span>
                  </span>
                </button>

                {!collapsed && (
                  <div
                    className={[
                      "grid transition-[grid-template-rows] duration-300 ease-in-out",
                      showAccordion ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    ].join(" ")}
                  >
                    <div className="overflow-hidden">
                      <div className="ml-5 mt-0.5 space-y-0.5 border-l-2 border-border pl-3">
                        {item.children.map((child) =>
                          renderChild(
                            child,
                            isChildActive(pathname, child),
                            item.label,
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {showFlyout && (
                  <div
                    ref={flyoutRef}
                    className="sidebar-flyout fixed z-50 min-w-[190px] rounded-lg border border-border bg-bg-elevated p-1.5 shadow-xl shadow-black/40"
                    style={{ top: flyoutPos.top, left: flyoutPos.left }}
                  >
                    {item.children.map((child) =>
                      renderChild(
                        child,
                        isChildActive(pathname, child),
                        item.label,
                      ),
                    )}
                  </div>
                )}
              </div>
            );
          }

          if (item.disabled || !item.href) {
            return (
              <span
                key={item.label}
                className={itemClass(false, true)}
                title={collapsed ? `${item.label} (Coming soon)` : "Coming soon"}
              >
                <span className="w-4 shrink-0 text-center text-xs opacity-70">
                  {item.icon}
                </span>
                <span
                  className={[
                    "flex min-w-0 flex-1 items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out",
                    collapsed
                      ? "max-w-0 opacity-0"
                      : "max-w-[200px] opacity-100",
                  ].join(" ")}
                >
                  <span className="flex-1 truncate whitespace-nowrap">
                    {item.label}
                  </span>
                  <span className="shrink-0 text-[9px] uppercase tracking-wide text-text-dim">
                    Soon
                  </span>
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={itemClass(active)}
              title={collapsed ? item.label : undefined}
            >
              <span className="w-4 shrink-0 text-center text-xs opacity-70">
                {item.icon}
              </span>
              <span
                className={[
                  "flex-1 truncate whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out",
                  collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100",
                ].join(" ")}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
