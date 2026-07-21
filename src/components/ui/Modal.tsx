"use client";

import { useEffect, type ReactNode } from "react";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
};

export function Modal({ title, onClose, children, footer, size = "md" }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={[
          "relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/50",
          size === "lg" ? "max-w-3xl" : "max-w-xl",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          >
            ✕
          </button>
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
