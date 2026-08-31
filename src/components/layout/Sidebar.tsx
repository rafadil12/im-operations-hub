"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImOneLogo } from "@/components/brand/ImOneLogo";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLang } from "@/lib/i18n";
import { SidebarNav } from "./SidebarNav";
import { navItems, settingsAdminOnly, type NavChild } from "./sidebarConfig";
import { flattenNavLeaves, isSparepartLeafVisible } from "./sidebarNavUtils";

// Survives AppShell remounts during client-side navigations.
let cachedOpenMenus: Record<string, boolean> = {};
let cachedCollapsed = false;

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
    canViewSafetyOverview,
    canViewSafetySubmissions,
    canCreateSafetySubmission,
    canUpdateSafetySubmission,
    canViewTrainingOverview,
    canViewTrainingSessions,
    canCreateTrainingSession,
    canUpdateTrainingSession,
    canViewSparepartOverview,
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
        if (item.id === "dashboard") return canViewOverview;
        if (item.id === "settings") {
          return !settingsAdminOnly || canAccessSettings;
        }
        if (item.id === "itsm") {
          return canViewItsmOverview || canViewItsmRequests || canViewItsmAnalysis;
        }
        if (item.id === "daily-operation") {
          return canViewDailyRecords || canViewDailyAnalysis || canManageConfiguration;
        }
        if (item.id === "safety") {
          return canViewSafetyOverview || canViewSafetySubmissions;
        }
        if (item.id === "training") {
          return (
            canViewTrainingOverview ||
            canViewTrainingSessions ||
            canCreateTrainingSession ||
            canUpdateTrainingSession
          );
        }
        if (item.id === "sparepart") {
          return (
            canViewSparepartOverview ||
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
        if (item.id === "safety" && item.children) {
          return {
            ...item,
            children: item.children.filter((child) => {
              if (child.id === "overview") return canViewSafetyOverview;
              if (child.id === "management") {
                return (
                  canViewSafetySubmissions || canCreateSafetySubmission || canUpdateSafetySubmission
                );
              }
              return true;
            }),
          };
        }
        if (item.id === "training" && item.children) {
          return {
            ...item,
            children: item.children.filter((child) => {
              if (child.id === "overview") return canViewTrainingOverview;
              if (child.id === "session") {
                return (
                  canViewTrainingSessions ||
                  canCreateTrainingSession ||
                  canUpdateTrainingSession
                );
              }
              return true;
            }),
          };
        }
        if (item.id === "sparepart" && item.children) {
          const sparepartAccess = {
            canViewSparepartStock,
            canPostSparepartDocument,
            canViewSparepartDocuments,
            canViewSparepartMaterials,
            canManageSparepartLocations,
          };

          return {
            ...item,
            children: item.children
              .map((child) => {
                if (child.id === "overview") {
                  return canViewSparepartOverview ? child : null;
                }
                if (child.id === "management" && child.children) {
                  const nested = child.children.filter((leaf) =>
                    isSparepartLeafVisible(leaf.id, sparepartAccess)
                  );
                  if (!nested.length) return null;
                  return { ...child, children: nested };
                }
                return child;
              })
              .filter((child): child is NavChild => child !== null),
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
    canCreateSafetySubmission,
    canManageAccounts,
    canManageConfiguration,
    canManageRoles,
    canManageSparepartLocations,
    canPostSparepartDocument,
    canUpdateSafetySubmission,
    canViewDailyAnalysis,
    canViewDailyRecords,
    canViewItsmAnalysis,
    canViewItsmOverview,
    canViewItsmRequests,
    canViewOverview,
    canViewSafetyOverview,
    canViewSafetySubmissions,
    canViewTrainingOverview,
    canViewTrainingSessions,
    canCreateTrainingSession,
    canUpdateTrainingSession,
    canViewSparepartDocuments,
    canViewSparepartMaterials,
    canViewSparepartOverview,
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

  const updateOpenMenus = (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
    setOpenMenus((prev) => {
      const next = updater(prev);
      cachedOpenMenus = next;
      return next;
    });
  };

  // Flyout uses fixed positioning so the scrollable nav cannot clip it.
  const syncFlyoutPos = useCallback(
    (key: string) => {
      const rect = triggerRefs.current[key]?.getBoundingClientRect();
      if (!rect) return;
      const children = visibleNavItems.find((item) => item.id === key)?.children ?? [];
      const childCount = flattenNavLeaves(children).length;
      const height = flyoutRef.current?.offsetHeight ?? childCount * 40 + 12;
      const top = Math.min(rect.top, Math.max(8, window.innerHeight - height - 8));
      setFlyoutPos({ top, left: rect.right + 8 });
    },
    [visibleNavItems]
  );

  useEffect(() => {
    if (!flyoutKey) return;

    const sync = () => syncFlyoutPos(flyoutKey);
    sync();

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (flyoutRef.current?.contains(target) || triggerRefs.current[flyoutKey]?.contains(target)) {
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

  return (
    <aside
      className={[
        "relative flex h-full shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar-bg text-sidebar-text transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]",
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
      <SidebarNav
        pathname={pathname}
        t={t}
        collapsed={collapsed}
        visibleNavItems={visibleNavItems}
        openMenus={openMenus}
        flyoutKey={flyoutKey}
        flyoutPos={flyoutPos}
        triggerRefs={triggerRefs}
        flyoutRef={flyoutRef}
        setFlyoutKey={setFlyoutKey}
        updateOpenMenus={updateOpenMenus}
      />
    </aside>
  );
}
