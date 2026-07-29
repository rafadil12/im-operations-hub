"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  const { lang, setLang } = useLang();
  const [now, setNow] = useState(() => new Date());

  const toggle = (next: Lang) => {
    if (next !== lang) setLang(next);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const currentDateTime = useMemo(
    () => {
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
    },
    [now],
  );

  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg/95 backdrop-blur-sm">
      <div className="flex h-[var(--topbar-height)] items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text">
            {title}
          </h2>
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
          <span className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs text-success">
            <span className="size-1.5 rounded-full bg-success" />
            Factory Status: Running
          </span>
          <span className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-muted">
            IT Manager
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border-subtle/60 px-5 py-2">
        <button
          type="button"
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          Refresh
        </button>
        <button
          type="button"
          className="rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        >
          Export Dashboard
        </button>
      </div>
    </header>
  );
}
