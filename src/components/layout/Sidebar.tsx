"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImOneLogo } from "@/components/brand/ImOneLogo";
import { NavIcon, type NavIconId } from "@/components/layout/NavIcons";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLang, type Dict } from "@/lib/i18n";

type NavLabelKey = keyof Dict["nav"];

type NavChild = {
  id: string;
  labelKey: NavLabelKey;
  href?: string;
  disabled?: boolean;
};

type NavItem = {
  id: string;
  labelKey: NavLabelKey;
  href?: string;
  icon: NavIconId;
  disabled?: boolean;
  children?: NavChild[];
};

const comingSoonChildren: NavChild[] = [
  { id: "management", labelKey: "moduleManagement", disabled: true },
  { id: "analysis", labelKey: "moduleAnalysis", disabled: true },
  { id: "master-data", labelKey: "masterData", disabled: true },
];

const navItems: NavItem[] = [
  { id: "overview", labelKey: "overview", href: "/", icon: "overview" },
  {
    id: "itsm",
    labelKey: "itsm",
    icon: "itsm",
    children: [
      { id: "overview", labelKey: "overview", href: "/itsm" },
      { id: "management", labelKey: "moduleManagement",  href: "/itsm/management" },
      { id: "analysis", labelKey: "moduleAnalysis", href: "/itsm/analysis" },
   
    ],
  },
  {
    id: "daily-operation",
    labelKey: "dailyOperation",
    icon: "daily-operation",
    children: [
      {
        id: "activities",
        labelKey: "management",
        href: "/daily-operation/management",
      },
      {
        id: "insights",
        labelKey: "analysis",
        href: "/daily-operation/analysis",
      },
      {
        id: "configuration",
        labelKey: "master",
        href: "/daily-operation/master/users",
      },
    ],
  },
  {
    id: "safety",
    labelKey: "safety",
    icon: "safety",
    disabled: true,
    children: comingSoonChildren,
  },
  {
    id: "sparepart",
    labelKey: "sparepart",
    icon: "sparepart",
    children: [
      {
        id: "stock",
        labelKey: "sparepartStock",
        href: "/sparepart/stock",
      },
      {
        id: "post",
        labelKey: "sparepartPost",
        href: "/sparepart/post",
      },
      {
        id: "documents",
        labelKey: "sparepartDocuments",
        href: "/sparepart/documents",
      },
      {
        id: "materials",
        labelKey: "sparepartMaterials",
        href: "/sparepart/materials",
      },
      {
        id: "locations",
        labelKey: "sparepartLocations",
        href: "/sparepart/locations",
      },
    ],
  },
  {
    id: "organization",
    labelKey: "organization",
    icon: "organization",
    disabled: true,
    children: comingSoonChildren,
  },
  {
    id: "report",
    labelKey: "report",
    icon: "report",
    disabled: true,
    children: comingSoonChildren,
  },
  {
    id: "training",
    labelKey: "training",
    icon: "training",
    disabled: true,
    children: comingSoonChildren,
  },
  {
    id: "settings",
    labelKey: "settings",
    icon: "settings",
    children: [
      { id: "roles", labelKey: "settingsRoles", href: "/settings/roles" },
      {
        id: "accounts",
        labelKey: "settingsAccounts",
        href: "/settings/accounts",
      },
    ],
  },
];

const settingsAdminOnly = true;

// Survives AppShell remounts during client-side navigations.
let cachedOpenMenus: Record<string, boolean> = {};
let cachedCollapsed = false;

function isChildActive(pathname: string, child: NavChild) {
  if (!child.href) return false;

  // ITSM Overview
  if (child.href === "/itsm") {
    return pathname === "/itsm";
  }

  // Daily Operation Master
  if (child.href === "/daily-operation/master/users") {
    return pathname.startsWith("/daily-operation/master");
  }

  // Settings
  if (child.href.startsWith("/settings/")) {
    return pathname.startsWith(child.href);
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
  const { t } = useLang();
  const {
    canViewOverview,
    canViewDailyRecords,
    canViewDailyAnalysis,
    canManageConfiguration,
    canViewItsmOverview,
    canViewItsmRequests,
    canViewItsmAnalysis,
    canViewSparepartStock,
    canViewSparepartDocuments,
    canPostSparepartDocument,
    canViewSparepartMaterials,
    canManageSparepartLocations,
    canAccessSettings,
    canManageRoles,
    canManageAccounts,
  } = useRoleAccess();
  const [collapsed, setCollapsed] = useState(cachedCollapsed);
  const [openMenus, setOpenMenus] = useState(cachedOpenMenus);
  const [flyoutKey, setFlyoutKey] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const flyoutRef = useRef<HTMLDivElement | null>(null);

  const visibleNavItems = useMemo(() => {
    return navItems
      .filter((item) => {
        if (item.id === "overview") return canViewOverview;
        if (item.id === "settings") {
          return !settingsAdminOnly || canAccessSettings;
        }
        if (item.id === "itsm") {
          return (
            canViewItsmOverview ||
            canViewItsmRequests ||
            canViewItsmAnalysis
          );
        }
        if (item.id === "daily-operation") {
          return (
            canViewDailyRecords ||
            canViewDailyAnalysis ||
            canManageConfiguration
          );
        }
        if (item.id === "sparepart") {
          return (
            canViewSparepartStock ||
            canPostSparepartDocument ||
            canViewSparepartDocuments ||
            canViewSparepartMaterials ||
            canManageSparepartLocations
          );
        }
        return true;
      })
      .map((item) => {
        if (item.id === "settings" && item.children) {
          return {
            ...item,
            children: item.children.filter((child) => {
              if (child.id === "roles") return canManageRoles;
              if (child.id === "accounts") return canManageAccounts;
              return true;
            }),
          };
        }
        if (item.id === "itsm" && item.children) {
          return {
            ...item,
            children: item.children.filter((child) => {
              if (child.id === "overview") return canViewItsmOverview;
              if (child.id === "management") return canViewItsmRequests;
              if (child.id === "analysis") return canViewItsmAnalysis;
              return true;
            }),
          };
        }
        if (item.id === "daily-operation" && item.children) {
          return {
            ...item,
            children: item.children.filter((child) => {
              if (child.id === "activities") return canViewDailyRecords;
              if (child.id === "insights") return canViewDailyAnalysis;
              if (child.id === "configuration") return canManageConfiguration;
              return true;
            }),
          };
        }
        if (item.id === "sparepart" && item.children) {
          return {
            ...item,
            children: item.children.filter((child) => {
              if (child.id === "stock") return canViewSparepartStock;
              if (child.id === "post") return canPostSparepartDocument;
              if (child.id === "documents") return canViewSparepartDocuments;
              if (child.id === "materials") return canViewSparepartMaterials;
              if (child.id === "locations") return canManageSparepartLocations;
              return true;
            }),
          };
        }
        return item;
      })
      .filter((item) => {
        if (item.children) {
          return Boolean(item.children.length);
        }
        return true;
      });
  }, [
    canAccessSettings,
    canManageAccounts,
    canManageConfiguration,
    canManageRoles,
    canManageSparepartLocations,
    canPostSparepartDocument,
    canViewDailyAnalysis,
    canViewDailyRecords,
    canViewItsmAnalysis,
    canViewItsmOverview,
    canViewItsmRequests,
    canViewOverview,
    canViewSparepartDocuments,
    canViewSparepartMaterials,
    canViewSparepartStock,
  ]);

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
      visibleNavItems.find((item) => item.id === key)?.children?.length ?? 0;
    const height = flyoutRef.current?.offsetHeight ?? childCount * 40 + 12;
    const top = Math.min(
      rect.top,
      Math.max(8, window.innerHeight - height - 8),
    );
    setFlyoutPos({ top, left: rect.right + 8 });
  }, [visibleNavItems]);

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

  // Single source for top-level nav row padding/size — leaf (Overview) & parent (ITSM) share this.
  // min-h keeps leaf & parent rows equal (parent has an 18px chevron).
  const navItemRowBase = [
    "flex min-h-9 w-full items-center gap-3 rounded-md px-3 py-1 text-left text-sm transition-colors",
    collapsed ? "justify-center px-2" : "",
  ].join(" ");

  const itemClass = (active: boolean, disabled?: boolean) =>
    [
      navItemRowBase,
      active
        ? "bg-sidebar-active font-medium text-white"
        : disabled
          ? "text-sidebar-text-dim hover:bg-sidebar-hover"
          : "text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text",
    ].join(" ");

  const parentItemClass = (
    highlighted: boolean,
    disabled?: boolean,
  ) =>
    [
      navItemRowBase,
      "duration-200",
      highlighted
        ? collapsed
          ? "bg-sidebar-active font-medium text-white"
          : "bg-sidebar-active-soft font-medium text-sidebar-text"
        : disabled
          ? "text-sidebar-text-dim hover:bg-sidebar-hover"
          : "text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text",
    ].join(" ");

  const childClass = (active: boolean, disabled?: boolean) =>
    [
      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
      active
        ? "bg-sidebar-active font-medium text-white"
        : disabled
          ? "cursor-not-allowed text-sidebar-text-dim"
          : "text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text",
    ].join(" ");

  const navIconWrap = (opacity: string) =>
    `flex size-4 shrink-0 items-center justify-center ${opacity}`;

  const navLabelWrap = [
    "flex min-w-0 flex-1 items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out",
    collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100",
  ].join(" ");

  const renderChild = (
    child: NavChild,
    active: boolean,
    parentId: string,
  ) => {
    const label = t.nav[child.labelKey];

    if (child.disabled || !child.href) {
      return (
        <span
          key={child.id}
          className={childClass(false, true)}
          title={t.nav.comingSoon}
        >
          <span className="flex-1 truncate">{label}</span>
          <span className="text-[9px] uppercase tracking-wide text-sidebar-text-dim">
            {t.nav.soon}
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
          updateOpenMenus((prev) => ({ ...prev, [parentId]: true }));
        }}
        className={childClass(active)}
      >
        <span className="flex-1 truncate">{label}</span>
      </Link>
    );
  };

  return (
    <aside
      className={[
        "relative flex h-full shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar-bg text-sidebar-text transition-[width] duration-300 ease-in-out",
        collapsed
          ? "w-[var(--sidebar-collapsed-width)]"
          : "w-[var(--sidebar-width)]",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-[var(--topbar-height)] shrink-0 items-center border-b border-sidebar-border-subtle transition-all duration-300 ease-in-out",
          collapsed ? "justify-center px-2" : "justify-between gap-2 px-4",
        ].join(" ")}
      >
        {collapsed ? (
          // Collapsed: the mark doubles as the expand control so the header
          // stays a single row aligned with the topbar.
          <button
            type="button"
            onClick={toggleCollapsed}
            className="rounded-md p-1 transition-colors hover:bg-sidebar-hover"
            aria-label={t.nav.expandSidebar}
            aria-expanded={false}
            title={t.nav.expandSidebar}
          >
            <ImOneLogo variant="mark" />
          </button>
        ) : (
          <>
            <ImOneLogo
              variant="full"
              className="min-w-0 flex-1 overflow-hidden text-sidebar-text"
            />
            <button
              type="button"
              onClick={toggleCollapsed}
              className="shrink-0 rounded-md p-1.5 text-sidebar-text-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text"
              aria-label={t.nav.collapseSidebar}
              aria-expanded
            >
              <span aria-hidden className="block text-base leading-none">
                ☰
              </span>
            </button>
          </>
        )}
      </div>

      <nav className="sidebar-scroll flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto px-2 py-3">
        {visibleNavItems.map((item) => {
          const active = isParentActive(pathname, item);
          const label = t.nav[item.labelKey];

          if (item.children?.length) {
            const menuOpen = openMenus[item.id] ?? active;
            const showAccordion = !collapsed && menuOpen;
            const showFlyout = collapsed && flyoutKey === item.id;
            const parentHighlighted = collapsed ? active : menuOpen || active;

            return (
              <div key={item.id} className="relative">
                <button
                  type="button"
                  ref={(node) => {
                    triggerRefs.current[item.id] = node;
                  }}
                  onClick={() => {
                    if (collapsed) {
                      setFlyoutKey((prev) =>
                        prev === item.id ? null : item.id,
                      );
                      return;
                    }
                    updateOpenMenus((prev) => ({
                      ...prev,
                      [item.id]: !(prev[item.id] ?? active),
                    }));
                  }}
                  className={parentItemClass(
                    parentHighlighted,
                    item.disabled,
                  )}
                  aria-expanded={collapsed ? showFlyout : menuOpen}
                  title={collapsed ? label : undefined}
                >
                  <span
                    className={[
                      navIconWrap(
                        parentHighlighted
                          ? "opacity-100"
                          : item.disabled
                            ? "opacity-55"
                            : "opacity-90",
                      ),
                      "transition-opacity duration-200",
                    ].join(" ")}
                  >
                    <NavIcon
                      id={item.icon}
                      active={collapsed && parentHighlighted}
                    />
                  </span>
                  <span className={navLabelWrap}>
                    <span className="flex-1 truncate whitespace-nowrap">
                      {label}
                    </span>
                    {item.disabled && (
                      <span className="shrink-0 text-[9px] uppercase tracking-wide text-sidebar-text-dim">
                        {t.nav.soon}
                      </span>
                    )}
                    <span
                      className={[
                        "flex size-[18px] shrink-0 items-center justify-center text-[18px] leading-none text-sidebar-text-dim transition-transform duration-300 ease-in-out",
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
                      <div className="ml-5 mt-0.5 space-y-0.5 border-l-2 border-sidebar-border pl-3">
                        {item.children.map((child) =>
                          renderChild(
                            child,
                            isChildActive(pathname, child),
                            item.id,
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {showFlyout && (
                  <div
                    ref={flyoutRef}
                    className="sidebar-flyout fixed z-50 min-w-[190px] rounded-lg border border-sidebar-border bg-sidebar-bg p-1.5 shadow-xl shadow-[0_12px_32px_var(--sidebar-shadow)]"
                    style={{ top: flyoutPos.top, left: flyoutPos.left }}
                  >
                    {item.children.map((child) =>
                      renderChild(
                        child,
                        isChildActive(pathname, child),
                        item.id,
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
                key={item.id}
                className={itemClass(false, true)}
                title={
                  collapsed
                    ? `${label} (${t.nav.comingSoon})`
                    : t.nav.comingSoon
                }
              >
                <span className={navIconWrap("opacity-55")}>
                  <NavIcon id={item.icon} />
                </span>
                <span className={navLabelWrap}>
                  <span className="flex-1 truncate whitespace-nowrap">
                    {label}
                  </span>
                  <span className="shrink-0 text-[9px] uppercase tracking-wide text-sidebar-text-dim">
                    {t.nav.soon}
                  </span>
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={itemClass(active)}
              title={collapsed ? label : undefined}
            >
              <span className={navIconWrap("opacity-90")}>
                <NavIcon id={item.icon} active={active} />
              </span>
              <span className={navLabelWrap}>
                <span className="flex-1 truncate whitespace-nowrap">
                  {label}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
