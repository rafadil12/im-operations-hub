"use client";

import { useEffect, useRef } from "react";
import type { SortDir, SortKey } from "@/lib/sparepart/sort";
import { STOCK_TABLE_TH } from "./stockTableRows";

function ChevronIcon({
  direction,
  active,
  className = "",
}: {
  direction: "up" | "down";
  active: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 10 6"
      className={`h-2 w-2.5 shrink-0 ${
        active ? "text-text opacity-100" : "text-text-dim opacity-50"
      } ${className}`}
      fill="currentColor"
      aria-hidden
    >
      {direction === "up" ? <path d="M5 0L10 6H0L5 0Z" /> : <path d="M5 6L0 0H10L5 6Z" />}
    </svg>
  );
}

export function SortHeader({
  label,
  columnKey,
  sortKey,
  sortDir,
  open,
  onOpenChange,
  onSortChange,
  sortAscLabel,
  sortDescLabel,
  className = "",
  menuAlign = "left",
}: {
  label: string;
  columnKey: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSortChange: (key: SortKey | null, dir: SortDir | null) => void;
  sortAscLabel: string;
  sortDescLabel: string;
  className?: string;
  menuAlign?: "left" | "right";
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const active = sortKey === columnKey;
  const ariaSort = active ? (sortDir === "asc" ? "ascending" : "descending") : "none";
  const chevronDir = active && sortDir === "asc" ? "up" : "down";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  const pick = (dir: SortDir) => {
    if (active && sortDir === dir) {
      onSortChange(null, null);
    } else {
      onSortChange(columnKey, dir);
    }
    onOpenChange(false);
  };

  return (
    <th
      className={[
        STOCK_TABLE_TH,
        className,
        className.includes("text-center") ? "!text-center" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-sort={ariaSort}
    >
      <div
        className={["relative inline-block", className.includes("text-center") ? "w-full" : ""]
          .filter(Boolean)
          .join(" ")}
        ref={menuRef}
      >
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={[
            "inline-flex items-center rounded-sm uppercase tracking-wide transition-colors",
            "hover:text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
            className.includes("text-center") ? "justify-center w-full" : "text-left",
            active || open ? "text-text" : "text-text-dim",
          ].join(" ")}
        >
          {label}
          <ChevronIcon direction={chevronDir} active={active || open} className="ml-1.5" />
        </button>

        {open ? (
          <div
            role="menu"
            className={[
              "absolute z-30 mt-1 min-w-[10.5rem] rounded-md border border-border bg-bg-elevated py-1 shadow-lg",
              menuAlign === "right" ? "right-0" : "left-0",
            ].join(" ")}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => pick("asc")}
              className={[
                "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs",
                active && sortDir === "asc"
                  ? "bg-accent/10 text-text"
                  : "text-text-muted hover:bg-surface-hover hover:text-text",
              ].join(" ")}
            >
              <ChevronIcon direction="up" active={active && sortDir === "asc"} />
              <span className="normal-case tracking-normal">{sortAscLabel}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => pick("desc")}
              className={[
                "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs",
                active && sortDir === "desc"
                  ? "bg-accent/10 text-text"
                  : "text-text-muted hover:bg-surface-hover hover:text-text",
              ].join(" ")}
            >
              <ChevronIcon direction="down" active={active && sortDir === "desc"} />
              <span className="normal-case tracking-normal">{sortDescLabel}</span>
            </button>
          </div>
        ) : null}
      </div>
    </th>
  );
}
