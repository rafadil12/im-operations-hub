"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type AlertDialogProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  confirmLabel?: string;
};

function subscribe() {
  return () => {};
}

export function AlertDialog({
  open,
  title,
  message,
  onClose,
  confirmLabel = "OK",
}: AlertDialogProps) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
        className="relative z-10 w-full max-w-md rounded-xl border border-danger/30 bg-surface p-4 shadow-[0_24px_60px_var(--shadow-color)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="alert-dialog-title" className="text-sm font-semibold text-danger">
          {title}
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-text">{message}</p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
