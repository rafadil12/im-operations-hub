"use client";

import Link from "next/link";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { NavIcon } from "@/components/layout/NavIcons";
import type { Dict } from "@/lib/i18n";
import type { NavChild, NavItem } from "./sidebarConfig";
import { flattenNavLeaves, isChildActive, isParentActive } from "./sidebarNavUtils";

type SidebarNavProps = {
  pathname: string;
  t: Dict;
  collapsed: boolean;
  visibleNavItems: NavItem[];
  openMenus: Record<string, boolean>;
  flyoutKey: string | null;
  flyoutPos: { top: number; left: number };
  triggerRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>;
  flyoutRef: MutableRefObject<HTMLDivElement | null>;
  setFlyoutKey: Dispatch<SetStateAction<string | null>>;
  updateOpenMenus: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
};

export function SidebarNav({
  pathname,
  t,
  collapsed,
  visibleNavItems,
  openMenus,
  flyoutKey,
  flyoutPos,
  triggerRefs,
  flyoutRef,
  setFlyoutKey,
  updateOpenMenus,
}: SidebarNavProps) {
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

  const parentItemClass = (highlighted: boolean, disabled?: boolean) =>
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

  const resolveLabel = (child: { labelKey: NavChild["labelKey"]; label?: NavChild["label"] }) =>
    child.label
      ? t.safety.management === "安全管理"
        ? child.label[1]
        : child.label[0]
      : t.nav[child.labelKey];

  const renderChild = (child: NavChild, parentId: string) => {
    const label = resolveLabel(child);
    const active = isChildActive(pathname, child);

    if (child.children?.length) {
      const menuKey = `${parentId}-${child.id}`;
      const menuOpen = openMenus[menuKey] ?? active;

      return (
        <div key={child.id}>
          <button
            type="button"
            onClick={() => {
              updateOpenMenus((prev) => ({
                ...prev,
                [parentId]: true,
                [menuKey]: !(prev[menuKey] ?? active),
              }));
            }}
            className={[
              childClass(false),
              "w-full text-left",
              menuOpen || active ? "font-medium text-sidebar-text" : "",
            ].join(" ")}
            aria-expanded={menuOpen}
          >
            <span className="flex-1 truncate">{label}</span>
            <span
              className={[
                "flex size-[18px] shrink-0 items-center justify-center text-[18px] leading-none text-sidebar-text-dim transition-transform duration-300 ease-in-out",
                menuOpen ? "rotate-180" : "rotate-0",
              ].join(" ")}
              aria-hidden
            >
              ▾
            </span>
          </button>
          <div
            className={[
              "grid transition-[grid-template-rows] duration-300 ease-in-out",
              menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            ].join(" ")}
          >
            <div className="overflow-hidden">
              <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-sidebar-border pl-3">
                {child.children.map((nested) => renderChild(nested, parentId))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (child.disabled || !child.href) {
      return (
        <span key={child.id} className={childClass(false, true)} title={t.nav.comingSoon}>
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
          updateOpenMenus((prev) => ({
            ...prev,
            [parentId]: true,
            ...(parentId === "sparepart" ? { "sparepart-management": true } : {}),
          }));
        }}
        className={childClass(active)}
      >
        <span className="flex-1 truncate">{label}</span>
      </Link>
    );
  };

  return (
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
                    setFlyoutKey((prev) => (prev === item.id ? null : item.id));
                    return;
                  }
                  updateOpenMenus((prev) => ({
                    ...prev,
                    [item.id]: !(prev[item.id] ?? active),
                  }));
                }}
                className={parentItemClass(parentHighlighted, item.disabled)}
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
                          : "opacity-90"
                    ),
                    "transition-opacity duration-200",
                  ].join(" ")}
                >
                  <NavIcon id={item.icon} active={collapsed && parentHighlighted} />
                </span>
                <span className={navLabelWrap}>
                  <span className="flex-1 truncate whitespace-nowrap">{label}</span>
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
                      {item.children.map((child) => renderChild(child, item.id))}
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
                  {flattenNavLeaves(item.children).map((child) => renderChild(child, item.id))}
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
              title={collapsed ? `${label} (${t.nav.comingSoon})` : t.nav.comingSoon}
            >
              <span className={navIconWrap("opacity-55")}>
                <NavIcon id={item.icon} />
              </span>
              <span className={navLabelWrap}>
                <span className="flex-1 truncate whitespace-nowrap">{label}</span>
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
              <span className="flex-1 truncate whitespace-nowrap">{label}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
