import {
  eachDate,
  formatDateOnly,
  getCurrentMonth,
  resolveRange,
  toDateInput,
  type DateRange,
} from "@/lib/dateRange";

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function eachMonthKeys(range: DateRange): string[] {
  const [ys, ms] = range.start.slice(0, 7).split("-").map(Number);
  const [ye, me] = range.end.slice(0, 7).split("-").map(Number);
  const out: string[] = [];
  let y = ys;
  let m = ms;
  while (y < ye || (y === ye && m <= me)) {
    out.push(`${y}-${pad(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function eachWeekKeys(range: DateRange): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const iso of eachDate(range)) {
    const d = new Date(`${iso}T00:00:00`);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = formatDateOnly(monday);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

export function resolveOverviewRange(
  startInput?: string | null,
  endInput?: string | null
): DateRange {
  const startOk = Boolean(startInput && /^\d{4}-\d{2}-\d{2}/.test(startInput));
  const endOk = Boolean(endInput && /^\d{4}-\d{2}-\d{2}/.test(endInput));
  if (!startOk || !endOk) return getCurrentMonth();
  let period = resolveRange(startInput, endInput);
  if (toDateInput(period.start) > toDateInput(period.end)) {
    period = resolveRange(toDateInput(period.end), toDateInput(period.start));
  }
  return period;
}

export function n(value: unknown): number {
  return Number(value ?? 0);
}
