"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { getDict, useLang } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

type HeaderProps = {
  title: string;
};

function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
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
      className="size-3.5 shrink-0"
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
      className="size-3.5 shrink-0"
      aria-hidden
    >
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 16l4-4-4-4" />
      <path d="M19 12H10" />
    </svg>
  );
}

export function Header({ title }: HeaderProps) {
  const { lang, setLang } = useLang();
  const { account, loading, logout } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = getDict(lang);

  const toggle = (next: Lang) => {
    if (next !== lang) setLang(next);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const currentDateTime = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";

    return `${valueOf("weekday")}, ${valueOf("month")} ${valueOf("day")}, ${valueOf("year")} · ${valueOf("hour")}:${valueOf("minute")}`;
  }, [now]);

  const triggerClass =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text";

  const menuItemClass =
    "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs text-text-muted hover:bg-surface-hover hover:text-text";

  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg/95 backdrop-blur-sm">
      <div className="flex h-[var(--topbar-height)] items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-3">
          {/* Route label, not a heading: each page owns its own <h1>. */}
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-text">
            {title === "Dashboard"
              ? t.nav.dashboard
              : title === "Daily Operation"
                ? t.nav.dailyOperation
                : title}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
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
          <span className="hidden rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-muted lg:inline">
            {currentDateTime}
          </span>

          {loading ? (
            <span className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-dim">
              …
            </span>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className={triggerClass}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <ProfileIcon />
                {account ? (
                  <>
                    <span className="max-w-[8rem] truncate">
                      {account.displayName}
                    </span>
                    <span className="text-text-dim">·</span>
                    <span>{account.roleLabel}</span>
                  </>
                ) : (
                  <span>{t.auth.guest}</span>
                )}
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-1 min-w-[11rem] rounded-md border border-border bg-bg-elevated py-1 shadow-lg"
                >
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
                      <button
                        type="button"
                        role="menuitem"
                        className={menuItemClass}
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
                      <ProfileIcon />
                      {t.auth.signIn}
                    </Link>
                  )}
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
