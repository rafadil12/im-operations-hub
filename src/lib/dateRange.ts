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
