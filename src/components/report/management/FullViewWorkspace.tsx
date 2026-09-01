"use client";

import { useEffect, type ReactNode } from "react";
import { FullViewIcon } from "@/components/ui/ActionIcons";
import { reportText, type ReportLanguage } from "@/lib/report";

type FullViewWorkspaceProps = {
  language: ReportLanguage;
  title: string;
  subtitle?: string;
  ariaLabel: string;
  onExit: () => void;
  exitDisabled?: boolean;
  showExitButton?: boolean;
  /** "close" = ✕ dismiss (forms); "fullView" = exit fullscreen toggle (summary table) */
  exitButtonVariant?: "close" | "fullView";
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function FullViewWorkspace({
  language,
  title,
  subtitle,
  ariaLabel,
  onExit,
  exitDisabled = false,
  showExitButton = true,
  exitButtonVariant = "fullView",
  toolbar,
  footer,
  children,
}: FullViewWorkspaceProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !exitDisabled) onExit();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onExit, exitDisabled]);

  const exitLabel =
    exitButtonVariant === "close"
      ? language === "cn"
        ? "关闭"
        : "Close"
      : reportText("summaryExitFullView", language);

  const exitBtnClass =
    exitButtonVariant === "close"
      ? "shrink-0 cursor-pointer rounded-md px-2 py-1 text-sm leading-none text-text-muted transition-colors hover:bg-surface-hover hover:text-text disabled:pointer-events-none disabled:opacity-50"
      : "inline-flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-text-muted hover:bg-surface-hover hover:text-text disabled:pointer-events-none disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col bg-bg text-text"
      role="region"
      aria-label={ariaLabel}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border-subtle px-5 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p> : null}
        </div>
        {showExitButton ? (
          <button
            type="button"
            onClick={onExit}
            disabled={exitDisabled}
            className={exitBtnClass}
            title={exitLabel}
            aria-label={exitLabel}
          >
            {exitButtonVariant === "close" ? "✕" : <FullViewIcon className="size-3.5" />}
          </button>
        ) : null}
      </header>

      {toolbar ? (
        <div className="relative z-10 shrink-0 border-b border-border-subtle px-5 py-3">
          {toolbar}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">{children}</div>

      {footer ? (
        <div className="flex shrink-0 justify-end gap-2 border-t border-border-subtle px-5 py-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
