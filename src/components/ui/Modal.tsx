"use client";

import { useEffect, type ReactNode } from "react";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
  size?: "md" | "lg" | "xl" | "2xl";
  /** When true, Escape / overlay / X cannot close the modal. */
  closeDisabled?: boolean;
};

const SIZE_CLASS = {
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  "2xl": "max-w-7xl",
} as const;

export function Modal({
  title,
  onClose,
  children,
  footer,
  headerActions,
  size = "md",
  closeDisabled = false,
}: ModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          "relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_var(--shadow-color)]",
          SIZE_CLASS[size],
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{title}</h3>
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              aria-label="Close"
              className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text disabled:pointer-events-none disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-border-subtle px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
