"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLang } from "@/lib/i18n";

type DrawerProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
  /** form ≈ 720px, detail ≈ 460px */
  width?: "form" | "detail";
  /** When true, Escape / overlay / X cannot close the drawer. */
  closeDisabled?: boolean;
};

const WIDTH_CLASS = {
  form: "w-full max-w-[720px]",
  detail: "w-full max-w-[460px]",
} as const;

function subscribe() {
  return () => {};
}

export function Drawer({
  title,
  subtitle,
  onClose,
  children,
  footer,
  headerActions,
  width = "form",
  closeDisabled = false,
}: DrawerProps) {
  const { t } = useLang();
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
    <div className="fixed inset-0 z-[999] flex justify-end">
      <button
        type="button"
        aria-label={t.common.closeOverlay}
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
          "animate-drawer-in relative z-10 flex h-full flex-col overflow-hidden border-l border-border bg-surface shadow-[0_24px_60px_var(--shadow-color)]",
          WIDTH_CLASS[width],
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-text">{title}</h3>
            {subtitle ? <div className="mt-1 text-xs text-text-muted">{subtitle}</div> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              aria-label={t.common.close}
              className="rounded-md px-2 py-1 text-sm leading-none text-text-muted transition-colors hover:bg-surface-hover hover:text-text disabled:pointer-events-none disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
        {footer ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-border-subtle px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
