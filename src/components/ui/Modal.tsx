"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
  size?: "md" | "lg" | "xl" | "2xl" | "full";
  /** When true, Escape / overlay / X cannot close the modal. */
  closeDisabled?: boolean;
};

const SIZE_CLASS = {
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  "2xl": "max-w-7xl",
  full: "h-full w-full max-w-none",
} as const;

const SHELL_CLASS: Record<NonNullable<ModalProps["size"]>, string> = {
  md: "fixed inset-0 z-[999] flex items-center justify-center p-10",
  lg: "fixed inset-0 z-[999] flex items-center justify-center p-10",
  xl: "fixed inset-0 z-[999] flex items-center justify-center p-10",
  "2xl": "fixed inset-0 z-[999] flex items-center justify-center p-10",
  full: "fixed inset-0 z-[999] flex p-1.5 sm:p-2",
};

const PANEL_CLASS: Record<NonNullable<ModalProps["size"]>, string> = {
  md: "max-h-[92vh] rounded-xl",
  lg: "max-h-[92vh] rounded-xl",
  xl: "max-h-[92vh] rounded-xl",
  "2xl": "max-h-[92vh] rounded-xl",
  full: "min-h-0 flex-1 rounded-lg",
};

function subscribe() {
  return () => {};
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  headerActions,
  size = "md",
  closeDisabled = false,
}: ModalProps) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closeDisabled) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, closeDisabled]);

  if (!mounted) return null;

  return createPortal(
    <div className={SHELL_CLASS[size]}>
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
        onClick={() => {
          if (!closeDisabled) onClose();
        }}
        disabled={closeDisabled}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={[
          "relative z-10 flex w-full flex-col overflow-hidden border border-border bg-surface shadow-[0_24px_60px_var(--shadow-color)]",
          PANEL_CLASS[size],
          SIZE_CLASS[size],
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-text">{title}</h3>
            {subtitle ? <div className="mt-1">{subtitle}</div> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              aria-label="Close"
              className="rounded-md px-2 py-1 text-sm leading-none text-text-muted transition-colors hover:bg-surface-hover hover:text-text disabled:pointer-events-none disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        </div>
        <div
          className={[
            "min-h-0 flex-1",
            size === "full" ? "flex flex-col overflow-hidden p-2" : "overflow-y-auto p-4",
          ].join(" ")}
        >
          {children}
        </div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-border-subtle px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
