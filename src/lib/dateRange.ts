export type DateRange = {
  start: string; // "YYYY-MM-DD HH:mm:ss"
  end: string; // "YYYY-MM-DD HH:mm:ss"
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Calendar month containing the reference date (1st 00:00:00 → last day 23:59:59).
 */
export function getCurrentMonth(reference: Date = new Date()): DateRange {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 0);

  return { start: formatDateTime(start), end: formatDateTime(end) };
}

/**
 * Calendar month immediately before the month that contains `reference`.
 */
export function getPreviousMonth(reference: Date = new Date()): DateRange {
  const start = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(reference.getFullYear(), reference.getMonth(), 0);
  end.setHours(23, 59, 59, 0);

  return { start: formatDateTime(start), end: formatDateTime(end) };
}

/**
 * Operational week: Saturday 00:00:00 to the following Friday 23:59:59.
 * Given a reference date, returns the operational week that contains it.
 */
export function getOperationalWeek(reference: Date = new Date()): DateRange {
  const ref = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  // getDay(): Sunday=0 ... Saturday=6. Days since last Saturday.
  const daysSinceSaturday = (ref.getDay() + 1) % 7;
  const start = new Date(ref);
  start.setDate(ref.getDate() - daysSinceSaturday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 0);

  return { start: formatDateTime(start), end: formatDateTime(end) };
}

/**
 * Build a range from date-only strings (inclusive). Falls back to the current
 * operational week when inputs are missing or invalid.
 */
export function resolveRange(
  startInput?: string | null,
  endInput?: string | null,
): DateRange {
  const week = getOperationalWeek();

  const startValid = startInput && /^\d{4}-\d{2}-\d{2}/.test(startInput);
  const endValid = endInput && /^\d{4}-\d{2}-\d{2}/.test(endInput);

  if (!startValid || !endValid) {
    return week;
  }

  const startDate = startInput.slice(0, 10);
  const endDate = endInput.slice(0, 10);

  return {
    start: `${startDate} 00:00:00`,
    end: `${endDate} 23:59:59`,
  };
}

/** Extract just the YYYY-MM-DD part for input[type=date] values. */
export function toDateInput(dateTime: string): string {
  return dateTime.slice(0, 10);
}

export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Inclusive calendar-day count of a range. */
export function inclusiveDayCount(range: DateRange): number {
  const start = parseDateOnly(range.start);
  const end = parseDateOnly(range.end);
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

/** Every YYYY-MM-DD in the range, inclusive. */
export function eachDate(range: DateRange): string[] {
  const start = parseDateOnly(range.start);
  const end = parseDateOnly(range.end);
  const out: string[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(formatDateOnly(d));
  }
  return out;
}

/**
 * Period of the same length immediately before `range`
 * (inclusive days, shifted back).
 */
export function previousPeriod(range: DateRange): DateRange {
  const days = inclusiveDayCount(range);
  const start = parseDateOnly(range.start);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  prevStart.setHours(0, 0, 0, 0);
  prevEnd.setHours(23, 59, 59, 0);
  return {
    start: formatDateTime(prevStart),
    end: formatDateTime(prevEnd),
  };
}
