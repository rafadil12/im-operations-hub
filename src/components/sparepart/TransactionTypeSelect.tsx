"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import type { MovementType } from "@/lib/types";

type ForwardType = Extract<MovementType, "101" | "201" | "311">;

type Props = {
  value: ForwardType;
  onChange: (value: ForwardType) => void;
  className?: string;
};

function IconReceive({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

function IconIssue({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21V9" />
      <path d="M7 14l5-5 5 5" />
      <path d="M4 5h16" />
    </svg>
  );
}

function IconTransfer({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 7h12l-3-3" />
      <path d="M16 17H4l3 3" />
      <path d="M19 7v4" />
      <path d="M5 17v-4" />
    </svg>
  );
}

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

const OPTIONS: {
  value: ForwardType;
  Icon: (props: { className?: string }) => ReactNode;
  labelKey: "movement101" | "movement201" | "movement311";
}[] = [
  { value: "101", Icon: IconReceive, labelKey: "movement101" },
  { value: "201", Icon: IconIssue, labelKey: "movement201" },
  { value: "311", Icon: IconTransfer, labelKey: "movement311" },
];

export function TransactionTypeSelect({ value, onChange, className = "" }: Props) {
  const { t } = useLang();
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

  const selected = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];
  const SelectedIcon = selected.Icon;

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-left text-sm text-text outline-none focus:border-accent"
      >
        <SelectedIcon className="h-4 w-4 shrink-0 text-text-muted" />
        <span className="min-w-0 flex-1 truncate">
          {t.sparepart[selected.labelKey]}
        </span>
        <ChevronDown className="h-2 w-2.5 shrink-0 text-text-dim" />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-md border border-border bg-bg-elevated py-1 shadow-lg"
        >
          {OPTIONS.map(({ value: optValue, Icon, labelKey }) => {
            const active = optValue === value;
            return (
              <li key={optValue} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(optValue);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                    active
                      ? "bg-accent text-white"
                      : "text-text-muted hover:bg-surface-hover hover:text-text",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "h-4 w-4 shrink-0",
                      active ? "text-white" : "text-text-muted",
                    ].join(" ")}
                  />
                  <span>{t.sparepart[labelKey]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
