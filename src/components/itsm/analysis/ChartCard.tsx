"use client";

import { useCallback, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useLang } from "@/lib/i18n";
import { captureChartImage, useChartColors } from "./itsmChartUtils";

export function ChartCard({
  title,
  children,
  expandedContent,
  className,
  modalSize = "2xl",
}: {
  title: string;
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  className?: string;
  modalSize?: "md" | "lg" | "xl" | "2xl";
}) {
  const { t } = useLang();
  const colors = useChartColors();
  const [open, setOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "copying" | "copied" | "failed">(
    "idle"
  );
  const exportRef = useRef<HTMLDivElement>(null);
  const captureBg = colors.captureBg;

  const runExport = useCallback(
    async (mode: "download" | "copy") => {
      const node = exportRef.current;
      if (!node) return;

      try {
        if (mode === "download") {
          const dataUrl = (await captureChartImage(node, "png", captureBg)) as string;
          const link = document.createElement("a");
          const safeName = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
          link.download = `${safeName || "chart"}.png`;
          link.href = dataUrl;
          link.click();
          return;
        }

        setExportStatus("copying");
        const blob = (await captureChartImage(node, "blob", captureBg)) as Blob;
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setExportStatus("copied");
        window.setTimeout(() => setExportStatus("idle"), 1800);
      } catch {
        setExportStatus("failed");
        window.setTimeout(() => setExportStatus("idle"), 2200);
      }
    },
    [title, captureBg]
  );

  const copyLabel =
    exportStatus === "copying"
      ? t.analysis.copying
      : exportStatus === "copied"
        ? t.analysis.copied
        : exportStatus === "failed"
          ? t.analysis.copyFailed
          : t.analysis.copyImage;

  return (
    <>
      <section
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`cursor-pointer rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-hover/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${className ?? ""}`}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <span className="shrink-0 rounded-md border border-border-subtle px-2 py-0.5 text-[10px] text-text-dim">
            {t.analysis.clickToExpand}
          </span>
        </div>
        <div>{children}</div>
      </section>

      {open ? (
        <Modal
          title={title}
          size={modalSize}
          onClose={() => {
            setOpen(false);
            setExportStatus("idle");
          }}
          headerActions={
            <>
              <button
                type="button"
                onClick={() => runExport("download")}
                className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              >
                {t.analysis.downloadPng}
              </button>
              <button
                type="button"
                onClick={() => runExport("copy")}
                disabled={exportStatus === "copying"}
                className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text disabled:opacity-60"
              >
                {copyLabel}
              </button>
            </>
          }
        >
          <div ref={exportRef} className="rounded-lg bg-surface p-2">
            {expandedContent ?? children}
          </div>
        </Modal>
      ) : null}
    </>
  );
}
