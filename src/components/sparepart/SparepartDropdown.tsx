"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type SparepartDropdownOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type Props = {
  value: string;
  options: SparepartDropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  /** Open the menu above the trigger (useful in pagination footers clipped by overflow). */
  menuPlacement?: "bottom" | "top";
};

export const sparepartDropdownFieldClass =
  "flex w-full items-center gap-2 rounded-md border border-border bg-bg text-left text-text outline-none focus:border-accent";

export const sparepartDropdownMenuClass =
  "absolute left-0 right-0 z-30 overflow-hidden rounded-md border border-border bg-bg-elevated py-1 shadow-lg";

function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 10 6"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M5 6L0 0h10L5 6Z" />
    </svg>
  );
}

export function sparepartDropdownOptionClass(active: boolean, compact = false): string {
  return [
    "flex w-full items-center gap-2 text-left",
    compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
    active ? "bg-accent text-white" : "text-text-muted hover:bg-surface-hover hover:text-text",
  ].join(" ");
}

export function SparepartDropdown({
  value,
  options,
  onChange,
  placeholder,
  className = "",
  compact = false,
  disabled = false,
  menuPlacement = "bottom",
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        className={[
          sparepartDropdownFieldClass,
          compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
          disabled ? "cursor-not-allowed opacity-60" : "",
        ].join(" ")}
      >
        {selected?.icon ? (
          <span className={selected ? "shrink-0 text-text-muted" : "shrink-0 text-text-dim"}>
            {selected.icon}
          </span>
        ) : null}
        <span className={`min-w-0 flex-1 truncate ${selected ? "text-text" : "text-text-dim"}`}>
          {selected?.label || placeholder || ""}
        </span>
        <ChevronDown className="h-2 w-2.5 shrink-0 text-text-dim" />
      </button>

      {open && !disabled ? (
        <ul
          role="listbox"
          className={[
            sparepartDropdownMenuClass,
            menuPlacement === "top" ? "bottom-full mb-1" : "mt-1",
          ].join(" ")}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={sparepartDropdownOptionClass(active, compact)}
                >
                  {option.icon ? (
                    <span className={active ? "shrink-0 text-white" : "shrink-0 text-text-muted"}>
                      {option.icon}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
