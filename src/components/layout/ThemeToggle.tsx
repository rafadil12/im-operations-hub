"use client";

import { useTheme } from "@/lib/theme";
import type { Theme } from "@/lib/types";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="size-3.5"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden
    >
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const buttonClass = (target: Theme) =>
    `flex cursor-pointer items-center gap-1 px-2.5 py-1.5 font-medium transition-colors ${
      theme === target
        ? "bg-accent text-white"
        : "bg-surface text-text-muted hover:bg-surface-hover hover:text-text"
    }`;

  return (
    <div
      className="inline-flex overflow-hidden rounded-md border border-border text-xs"
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={buttonClass("light")}
        aria-pressed={theme === "light"}
        title="Light theme"
      >
        <SunIcon />
        <span className="sr-only">Light theme</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={buttonClass("dark")}
        aria-pressed={theme === "dark"}
        title="Dark theme"
      >
        <MoonIcon />
        <span className="sr-only">Dark theme</span>
      </button>
    </div>
  );
}
