"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useLang } from "@/lib/i18n";
import type { SparepartItem } from "@/lib/types";

const MAX_SUGGESTIONS = 10;

type Props = {
  materials: SparepartItem[];
  value: string;
  onChange: (itemId: string) => void;
  className?: string;
};

function labelFor(item: SparepartItem): string {
  return `${item.code} — ${item.name}`;
}

function matchesQuery(item: SparepartItem, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [item.code, item.name, item.brand ?? "", item.model ?? ""].some((f) =>
    f.toLowerCase().includes(needle),
  );
}

export function MaterialCombobox({
  materials,
  value,
  onChange,
  className,
}: Props) {
  const { t } = useLang();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = materials.find((m) => String(m.id) === value) ?? null;

  const [query, setQuery] = useState(selected ? labelFor(selected) : "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (selected) {
      setQuery(labelFor(selected));
    } else if (!value) {
      setQuery("");
    }
  }, [selected, value]);

  const suggestions = useMemo(() => {
    const filtered = materials.filter((m) => matchesQuery(m, query));
    return filtered.slice(0, MAX_SUGGESTIONS);
  }, [materials, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (item: SparepartItem) => {
    onChange(String(item.id));
    setQuery(labelFor(item));
    setOpen(false);
  };

  const tryExactCode = () => {
    const code = query.trim().toLowerCase();
    if (!code) {
      onChange("");
      return;
    }
    const exact = materials.filter((m) => m.code.toLowerCase() === code);
    if (exact.length === 1) {
      pick(exact[0]);
      return;
    }
    if (selected && labelFor(selected).toLowerCase() === query.trim().toLowerCase()) {
      return;
    }
    if (!selected || labelFor(selected) !== query) {
      onChange("");
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) =>
        suggestions.length ? Math.min(h + 1, suggestions.length - 1) : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions[highlight]) {
        pick(suggestions[highlight]);
      } else {
        tryExactCode();
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={className}
        value={query}
        placeholder={`${t.sparepart.code} / ${t.sparepart.name}`}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so click on suggestion can fire first
          window.setTimeout(() => tryExactCode(), 120);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-surface shadow-lg"
        >
          {suggestions.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                className={[
                  "flex w-full flex-col items-start px-3 py-2 text-left text-xs",
                  index === highlight
                    ? "bg-accent-soft text-text"
                    : "text-text-muted hover:bg-surface-hover",
                ].join(" ")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
                onMouseEnter={() => setHighlight(index)}
              >
                <span className="font-medium text-text">
                  {item.code} — {item.name}
                </span>
                <span className="text-[11px] text-text-dim">
                  {(item.brand || "-") + " / " + (item.model || "-")} · stock:{" "}
                  {item.stock_current}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {selected ? (
        <p className="mt-1 text-[11px] text-text-dim">
          {selected.brand ?? "-"} / {selected.model ?? "-"} ·{" "}
          {selected.location ?? "-"} · stock: {selected.stock_current}
        </p>
      ) : null}
    </div>
  );
}
