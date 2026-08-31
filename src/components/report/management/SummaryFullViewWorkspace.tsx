"use client";

import { useEffect, type ReactNode } from "react";
import { reportText, type ReportLanguage } from "@/lib/report";

type SummaryFullViewWorkspaceProps = {
  language: ReportLanguage;
  subtitle: string;
  onExit: () => void;
  filters: ReactNode;
  children: ReactNode;
};

export function SummaryFullViewWorkspace({
  language,
  subtitle,
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
      <header className="shrink-0 border-b border-border-subtle px-5 py-3">
        <h2 className="text-sm font-semibold text-text">
          {reportText("summaryFullViewContext", language)}
        </h2>
        <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
      </header>

      <div className="relative z-10 shrink-0 border-b border-border-subtle px-5 py-3">{filters}</div>

      <div className="min-h-0 flex-1 overflow-hidden px-5 pb-5 pt-3">{children}</div>
    </div>
  );
}
