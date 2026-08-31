"use client";

import { useEffect, type ReactNode } from "react";
import { reportText, type ReportLanguage } from "@/lib/report";

const filterCtrl =
  "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";

type SummaryFullViewWorkspaceProps = {
  language: ReportLanguage;
  subtitle: string;
  year: number;
  onYearChange: (year: number) => void;
  onExit: () => void;
  filters: ReactNode;
  children: ReactNode;
};

function ExitFullViewIcon() {
  return (
    <svg
      className="size-3.5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
      />
    </svg>
  );
}

export function SummaryFullViewWorkspace({
  language,
  subtitle,
  year,
  onYearChange,
  onExit,
  filters,
  children,
}: SummaryFullViewWorkspaceProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExit();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onExit]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col bg-bg text-text"
      role="region"
      aria-label={reportText("summaryTab", language)}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text">
            {reportText("summaryFullViewContext", language)}
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={filterCtrl + " w-auto"}
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            aria-label={reportText("year", language)}
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          >
            <ExitFullViewIcon />
            {reportText("summaryExitFullView", language)}
          </button>
        </div>
      </header>

      <div className="shrink-0 border-b border-border-subtle px-5 py-3">{filters}</div>

      <div className="min-h-0 flex-1 overflow-hidden px-5 pb-5 pt-3">{children}</div>
    </div>
  );
}
