"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { getDict, useLang } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

let clockMsValue = 0;

function subscribeClock(onStoreChange: () => void) {
  clockMsValue = Date.now();
  const timer = window.setInterval(() => {
    clockMsValue = Date.now();
    onStoreChange();
  }, 1000);
  return () => window.clearInterval(timer);
}

function getClockSnapshot() {
  return clockMsValue;
}

/** Server + hydration: fixed snapshot so SSR/client HTML match. */
function getClockServerSnapshot() {
  return 0;
}

function subscribeIsClient() {
  return () => {};
}

function getIsClientSnapshot() {
  return true;
}

function getIsClientServerSnapshot() {
  return false;
}

type HeaderProps = {
  title: string;
};

function ProfileIcon({ className = "size-3.5 shrink-0" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19.5c1.5-3.2 4-4.8 6.5-4.8s5 1.6 6.5 4.8" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
      aria-hidden
    >
      <circle cx="8" cy="15" r="3.5" />
      <path d="M10.5 12.5L20 3" />
      <path d="M16 4l3 3" />
      <path d="M18 6l2-2" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
      aria-hidden
    >
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 16l4-4-4-4" />
      <path d="M19 12H10" />
    </svg>
  );
}

function accountInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function AvatarCircle({
  label,
  size = "sm",
}: {
  label: string;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "md" ? "size-10 text-sm" : "size-7 text-[11px]";
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold tracking-wide text-accent",
        sizeClass,
      ].join(" ")}
      aria-hidden
    >
      {label}
    </span>
  );
}

export function Header({ title }: HeaderProps) {
  const { lang, setLang } = useLang();
  const { account, loading, logout } = useAuth();
  const isClient = useSyncExternalStore(
    subscribeIsClient,
    getIsClientSnapshot,
    getIsClientServerSnapshot
  );
  const clockMs = useSyncExternalStore(subscribeClock, getClockSnapshot, getClockServerSnapshot);
  const [menuOpen, setMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = getDict(lang);

  const toggle = (next: Lang) => {
    if (next !== lang) setLang(next);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const currentDateTime = useMemo(() => {
    if (!isClient) return "";
    const parts = new Intl.DateTimeFormat(lang === "cn" ? "zh-CN" : "en-US", {
      weekday: "long",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(clockMs));
    const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";

    return `${valueOf("weekday")}, ${valueOf("month")} ${valueOf("day")}, ${valueOf("year")} · ${valueOf("hour")}:${valueOf("minute")}`;
  }, [lang, clockMs, isClient]);

  const menuItemClass =
    "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text";

  const titleByRoute: Record<string, string> = {
    Dashboard: t.nav.dashboard,
    "Daily Operation": t.nav.dailyOperation,
    ITSM: t.nav.itsm,
    Sparepart: t.nav.sparepart,
    Safety: t.nav.safety,
    Settings: t.nav.settings,
  };
  const routeLabel = titleByRoute[title] ?? title;

  const avatarLabel = account ? accountInitials(account.displayName) : "?";
  const subtitle = account
    ? [account.roleLabel, account.employeeId].filter(Boolean).join(" · ")
    : t.auth.guest;

  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg/95 backdrop-blur-sm">
      <div className="flex h-[var(--topbar-height)] items-center justify-between gap-4 px-5">
        <div className="flex min-w-0 items-center gap-3">
          {/* Route label, not a heading: each page owns its own <h1>. */}
          <p className="truncate text-sm font-semibold uppercase tracking-[0.12em] text-text">
            {routeLabel}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="inline-flex overflow-hidden rounded-md border border-border text-xs">
            <button
              type="button"
              onClick={() => toggle("en")}
              className={`cursor-pointer px-2.5 py-1.5 font-medium transition-colors ${
                lang === "en"
                  ? "bg-accent text-white"
                  : "bg-surface text-text-muted hover:bg-surface-hover hover:text-text"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => toggle("cn")}
              className={`cursor-pointer px-2.5 py-1.5 font-medium transition-colors ${
                lang === "cn"
                  ? "bg-accent text-white"
                  : "bg-surface text-text-muted hover:bg-surface-hover hover:text-text"
              }`}
            >
              CN
            </button>
          </div>
          <ThemeToggle />
          <span
            className="hidden min-w-[11rem] rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-muted lg:inline"
            suppressHydrationWarning
          >
            {currentDateTime || "\u00a0"}
          </span>

          {loading ? (
            <span className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-surface text-xs text-text-dim">
              …
            </span>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className={[
                  "inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 text-xs text-text-muted transition-colors",
                  "hover:bg-surface-hover hover:text-text",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  menuOpen ? "border-accent/40 bg-surface-hover text-text" : "",
                ].join(" ")}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label={account ? account.displayName : t.auth.guest}
              >
                <AvatarCircle label={avatarLabel} size="sm" />
                <span className="hidden max-w-[7.5rem] truncate sm:inline">
                  {account ? account.displayName : t.auth.guest}
                </span>
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-lg"
                >
                  <div className="flex items-start gap-3 border-b border-border-subtle px-3.5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text">
                        {account ? account.displayName : t.auth.guest}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-text-muted">{subtitle}</p>
                    </div>
                    <AvatarCircle label={avatarLabel} size="md" />
                  </div>

                  <div className="p-1.5">
                    {account ? (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          className={menuItemClass}
                          onClick={() => {
                            setMenuOpen(false);
                            setChangePasswordOpen(true);
                          }}
                        >
                          <KeyIcon />
                          {t.auth.changePassword}
                        </button>
                        <div className="my-1 border-t border-border-subtle" />
                        <button
                          type="button"
                          role="menuitem"
                          className={`${menuItemClass} text-danger hover:bg-danger/10 hover:text-danger`}
                          onClick={async () => {
                            setMenuOpen(false);
                            await logout();
                          }}
                        >
                          <LogoutIcon />
                          {t.auth.logout}
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/login"
                        role="menuitem"
                        className={menuItemClass}
                        onClick={() => setMenuOpen(false)}
                      >
                        <ProfileIcon className="size-4 shrink-0" />
                        {t.auth.signIn}
                      </Link>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {changePasswordOpen ? (
        <ChangePasswordModal onClose={() => setChangePasswordOpen(false)} />
      ) : null}
    </header>
  );
}
