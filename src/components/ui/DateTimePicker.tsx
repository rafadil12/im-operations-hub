"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseValue(value: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

function formatValue(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Monday-first weekday index (0 = Mon … 6 = Sun). */
function mondayIndex(year: number, month: number, day: number): number {
  const js = new Date(year, month - 1, day).getDay();
  return (js + 6) % 7;
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function displayText(value: string): string {
  const parsed = parseValue(value);
  if (!parsed) return "dd/mm/yyyy --:--";
  return `${pad(parsed.day)}/${pad(parsed.month)}/${parsed.year} ${pad(parsed.hour)}:${pad(parsed.minute)}`;
}

function ScrollColumn({
  items,
  selected,
  onSelect,
  label,
}: {
  items: number[];
  selected: number;
  onSelect: (n: number) => void;
  label: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const el = itemRefs.current.get(selected);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selected]);

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={label}
      className="h-48 w-12 overflow-y-auto overscroll-contain rounded-md border border-border-subtle bg-bg/30"
    >
      {items.map((n) => {
        const active = n === selected;
        return (
          <button
            key={n}
            type="button"
            role="option"
            aria-selected={active}
            ref={(el) => {
              if (el) itemRefs.current.set(n, el);
              else itemRefs.current.delete(n);
            }}
            onClick={() => onSelect(n)}
            className={[
              "flex h-8 w-full items-center justify-center text-xs tabular-nums transition-colors",
              active
                ? "bg-accent font-semibold text-white"
                : "text-text-muted hover:bg-surface-hover hover:text-text",
            ].join(" ")}
          >
            {pad(n)}
          </button>
        );
      })}
    </div>
  );
}

export function DateTimePicker({
  value,
  onChange,
  className = "",
  disabled = false,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: Props) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const parsed = parseValue(value);
  const now = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(
    () => parsed?.year ?? now.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    () => parsed?.month ?? now.getMonth() + 1,
  );
  const [hour, setHour] = useState(() => parsed?.hour ?? now.getHours());
  const [minute, setMinute] = useState(
    () => parsed?.minute ?? now.getMinutes(),
  );
  const [selectedDay, setSelectedDay] = useState<{
    year: number;
    month: number;
    day: number;
  } | null>(
    () =>
      parsed
        ? { year: parsed.year, month: parsed.month, day: parsed.day }
        : null,
  );

  const seedFromValue = useCallback(() => {
    const p = parseValue(value);
    const d = new Date();
    const base = p ?? {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
    };
    setViewYear(base.year);
    setViewMonth(base.month);
    setHour(base.hour);
    setMinute(base.minute);
    setSelectedDay(
      p
        ? { year: p.year, month: p.month, day: p.day }
        : { year: base.year, month: base.month, day: base.day },
    );
  }, [value]);

  const toggleOpen = () => {
    if (disabled) return;
    if (!open) seedFromValue();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const commit = useCallback(
    (
      day: { year: number; month: number; day: number },
      h: number,
      m: number,
    ) => {
      const clampedH = Math.min(23, Math.max(0, h));
      const clampedM = Math.min(59, Math.max(0, m));
      onChange(
        formatValue(day.year, day.month, day.day, clampedH, clampedM),
      );
    },
    [onChange],
  );

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  };

  const calendarCells = useMemo(() => {
    const firstDow = mondayIndex(viewYear, viewMonth, 1);
    const dim = daysInMonth(viewYear, viewMonth);
    const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
    const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
    const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1;
    const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear;
    const prevDim = daysInMonth(prevYear, prevMonth);

    const cells: {
      day: number;
      month: number;
      year: number;
      inMonth: boolean;
    }[] = [];

    for (let i = firstDow - 1; i >= 0; i--) {
      cells.push({
        day: prevDim - i,
        month: prevMonth,
        year: prevYear,
        inMonth: false,
      });
    }
    for (let d = 1; d <= dim; d++) {
      cells.push({ day: d, month: viewMonth, year: viewYear, inMonth: true });
    }
    let nextDay = 1;
    while (cells.length < 42) {
      cells.push({
        day: nextDay++,
        month: nextMonth,
        year: nextYear,
        inMonth: false,
      });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const pickDay = (cell: {
    year: number;
    month: number;
    day: number;
    inMonth: boolean;
  }) => {
    const day = { year: cell.year, month: cell.month, day: cell.day };
    setSelectedDay(day);
    if (!cell.inMonth) {
      setViewYear(cell.year);
      setViewMonth(cell.month);
    }
    commit(day, hour, minute);
  };

  const pickHour = (h: number) => {
    const clamped = Math.min(23, Math.max(0, h));
    setHour(clamped);
    if (selectedDay) commit(selectedDay, clamped, minute);
  };

  const pickMinute = (m: number) => {
    const clamped = Math.min(59, Math.max(0, m));
    setMinute(clamped);
    if (selectedDay) commit(selectedDay, hour, clamped);
  };

  const clear = () => {
    onChange("");
    setSelectedDay(null);
    setOpen(false);
  };

  const today = () => {
    const d = new Date();
    const day = {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    };
    const h = d.getHours();
    const m = d.getMinutes();
    setViewYear(day.year);
    setViewMonth(day.month);
    setSelectedDay(day);
    setHour(h);
    setMinute(m);
    commit(day, h, m);
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        data-invalid={ariaInvalid ? "true" : undefined}
        aria-describedby={ariaDescribedBy}
        onClick={toggleOpen}
        className={[
          "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-bg/40 px-3 py-2 text-left text-sm outline-none focus:border-accent disabled:opacity-60",
          value ? "text-text" : "text-text-dim",
          ariaInvalid ? "border-danger" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="truncate tabular-nums">{displayText(value)}</span>
        <span className="shrink-0 text-text-muted" aria-hidden>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
            <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose date and time"
          className="absolute left-0 z-40 mt-1 flex w-max max-w-[min(100vw-2rem,420px)] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_16px_40px_var(--shadow-color)]"
        >
          <div className="border-r border-border-subtle p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-text">
                {monthLabel(viewYear, viewMonth)}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => shiftMonth(-1)}
                  className="rounded px-1.5 py-0.5 text-xs text-text-muted hover:bg-surface-hover hover:text-text"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => shiftMonth(1)}
                  className="rounded px-1.5 py-0.5 text-xs text-text-muted hover:bg-surface-hover hover:text-text"
                >
                  ▼
                </button>
              </div>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[10px] font-medium text-text-dim"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calendarCells.map((cell) => {
                const isSelected =
                  selectedDay?.year === cell.year &&
                  selectedDay?.month === cell.month &&
                  selectedDay?.day === cell.day;
                const isToday =
                  now.getFullYear() === cell.year &&
                  now.getMonth() + 1 === cell.month &&
                  now.getDate() === cell.day;
                return (
                  <button
                    key={`${cell.year}-${cell.month}-${cell.day}-${cell.inMonth}`}
                    type="button"
                    onClick={() => pickDay(cell)}
                    className={[
                      "h-8 w-8 rounded-md text-xs tabular-nums transition-colors",
                      !cell.inMonth
                        ? "text-text-dim"
                        : "text-text hover:bg-surface-hover",
                      isSelected
                        ? "bg-accent font-semibold text-white hover:bg-accent"
                        : isToday
                          ? "bg-accent-soft text-accent"
                          : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex justify-between border-t border-border-subtle pt-2">
              <button
                type="button"
                onClick={clear}
                className="text-xs font-medium text-accent hover:underline"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={today}
                className="text-xs font-medium text-accent hover:underline"
              >
                Today
              </button>
            </div>
          </div>

          <div className="flex gap-2 p-3">
            <ScrollColumn
              items={HOURS}
              selected={hour}
              onSelect={pickHour}
              label="Hours (00–23)"
            />
            <ScrollColumn
              items={MINUTES}
              selected={minute}
              onSelect={pickMinute}
              label="Minutes (00–59)"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
