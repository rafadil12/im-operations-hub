"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ModuleCardData } from "@/data/overview-mock";
import { ModuleCard } from "./ModuleCard";

type CardExpandModalProps = {
  data: ModuleCardData;
  onClose: () => void;
};

export function CardExpandModal({ data, onClose }: CardExpandModalProps) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expanded-card-title"
        className={[
          "relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_var(--shadow-color)]",
          data.colSpan === 2 ? "max-w-6xl" : "max-w-4xl",
        ].join(" ")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <p id="expanded-card-title" className="text-sm font-semibold text-text">
            {data.number}. {data.title}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(data.href)}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              View Detail
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4">
          <ModuleCard data={data} expanded />
        </div>

        <p className="border-t border-border-subtle px-4 py-2 text-[11px] text-text-dim">
          Click View Detail to open the full module page.
        </p>
      </div>
    </div>
  );
}
