"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { apiGetAbs } from "@/lib/apiClient";
import { useLang, localizedName, localizedField } from "@/lib/i18n";
import type { SparepartItem } from "@/lib/types";
import {
  sparepartDropdownMenuClass,
  sparepartDropdownOptionClass,
} from "@/components/sparepart/SparepartDropdown";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 1;
const SUGGEST_LIMIT = 20;

type SuggestResponse = { rows: SparepartItem[] };
type DetailResponse = { row: SparepartItem };

type Props = {
  value: string;
  onChange: (itemId: string, item?: SparepartItem | null) => void;
  className?: string;
};

function labelFor(item: SparepartItem, lang: "en" | "cn"): string {
  return `${item.code} — ${localizedName(item, lang)}`;
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

export function MaterialCombobox({ value, onChange, className }: Props) {
  const { t, lang } = useLang();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const resolveAbortRef = useRef<AbortController | null>(null);

  const [selected, setSelected] = useState<SparepartItem | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SparepartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [searching, setSearching] = useState(false);

  // Clear local state when parent clears a selected value (e.g. form reset).
  // Do not clear query while searching (value is already empty).
  if (!value && selected !== null) {
    setSelected(null);
    setQuery("");
  }

  // Hydrate selected row when parent value is set (e.g. remount) without full catalog.
  useEffect(() => {
    if (!value) return;
    if (selected && String(selected.id) === value) return;

    resolveAbortRef.current?.abort();
    const ac = new AbortController();
    resolveAbortRef.current = ac;

    apiGetAbs<DetailResponse>(`/api/sparepart/materials/${value}`, {
      signal: ac.signal,
    })
      .then((data) => {
        setSelected(data.row);
        setQuery(labelFor(data.row, lang));
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setSelected(null);
      });

    return () => ac.abort();
    // intentionally omit `selected` — only react to value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      suggestAbortRef.current?.abort();
      resolveAbortRef.current?.abort();
    };
  }, []);

  const runSuggest = (raw: string) => {
    const needle = raw.trim();
    suggestAbortRef.current?.abort();

    if (needle.length < MIN_CHARS) {
      setSuggestions([]);
      setHighlight(0);
      setSearching(false);
      return;
    }

    const ac = new AbortController();
    suggestAbortRef.current = ac;
    setSearching(true);

    const params = new URLSearchParams({
      q: needle,
      limit: String(SUGGEST_LIMIT),
    });

    apiGetAbs<SuggestResponse>(
      `/api/sparepart/materials/suggest?${params.toString()}`,
      { signal: ac.signal },
    )
      .then((data) => {
        setSuggestions(data.rows);
        setHighlight(0);
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setSuggestions([]);
        setHighlight(0);
      })
      .finally(() => {
        if (!ac.signal.aborted) setSearching(false);
      });
  };

  const scheduleSuggest = (raw: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSuggest(raw), DEBOUNCE_MS);
  };

  const pick = (item: SparepartItem) => {
    setSelected(item);
    onChange(String(item.id), item);
    setQuery(labelFor(item, lang));
    setSuggestions([]);
    setOpen(false);
  };

  const tryExactCode = async () => {
    const code = query.trim();
    if (!code) {
      setSelected(null);
      onChange("", null);
      return;
    }
    if (selected && labelFor(selected, lang).toLowerCase() === code.toLowerCase()) {
      return;
    }

    suggestAbortRef.current?.abort();
    const ac = new AbortController();
    suggestAbortRef.current = ac;

    try {
      const params = new URLSearchParams({ exactCode: code });
      const data = await apiGetAbs<SuggestResponse>(
        `/api/sparepart/materials/suggest?${params.toString()}`,
        { signal: ac.signal },
      );
      if (data.rows.length === 1) {
        pick(data.rows[0]);
        return;
      }
    } catch (err) {
      if (isAbortError(err)) return;
    }

    if (!selected || labelFor(selected, lang) !== query) {
      setSelected(null);
      onChange("", null);
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
        void tryExactCode();
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && (suggestions.length > 0 || searching);

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
        placeholder={`${t.sparepart.code} / ${t.sparepart.name} / ${t.sparepart.brand} / ${t.sparepart.model}`}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setSelected(null);
          onChange("", null);
          setOpen(true);
          scheduleSuggest(next);
        }}
        onFocus={() => {
          setOpen(true);
          if (query.trim().length >= MIN_CHARS && !selected) {
            scheduleSuggest(query);
          }
        }}
        onBlur={() => {
          window.setTimeout(() => void tryExactCode(), 120);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className={`${sparepartDropdownMenuClass} z-20 max-h-56 overflow-auto`}
        >
          {searching && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-xs text-text-dim">{t.common.loading}</li>
          ) : null}
          {suggestions.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                className={[
                  sparepartDropdownOptionClass(index === highlight),
                  "flex-col items-start gap-0 text-xs",
                ].join(" ")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
                onMouseEnter={() => setHighlight(index)}
              >
                <span className={`font-medium ${index === highlight ? "text-white" : "text-text"}`}>
                  {item.code} — {localizedName(item, lang)}
                </span>
                <span
                  className={`text-[11px] ${
                    index === highlight ? "text-white/80" : "text-text-dim"
                  }`}
                >
                  {localizedField(item.brand_en, item.brand_cn, lang) +
                    " / " +
                    (item.model || "-")}{" "}
                  · stock:{" "}
                  {item.stock_current}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {selected ? (
        <p className="mt-1 text-[11px] text-text-dim">
          {localizedField(selected.brand_en, selected.brand_cn, lang)} /{" "}
          {selected.model ?? "-"} · stock: {selected.stock_current}
        </p>
      ) : null}
    </div>
  );
}
