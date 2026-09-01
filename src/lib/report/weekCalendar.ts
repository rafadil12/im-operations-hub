/** Week calendar: Saturday = day 1, Friday = day 7. Report due Friday. */

export function getYearAnchorSaturday(year: number): Date {
  const jan1 = new Date(year, 0, 1);
  const dow = (jan1.getDay() + 1) % 7;
  const sat = new Date(jan1);
  sat.setDate(sat.getDate() - dow);
  return sat;
}

export function getSaturdayForWeek(year: number, weekNumber: number): Date {
  const anchor = getYearAnchorSaturday(year);
  const sat = new Date(anchor);
  sat.setDate(sat.getDate() + (weekNumber - 1) * 7);
  return sat;
}

export function formatDateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function weekDateRange(year: number, weekNumber: number) {
  const startsOn = getSaturdayForWeek(year, weekNumber);
  const endsOn = new Date(startsOn);
  endsOn.setDate(endsOn.getDate() + 6);
  return {
    startsOn: formatDateOnly(startsOn),
    endsOn: formatDateOnly(endsOn),
    reportDueOn: formatDateOnly(endsOn),
  };
}

export function weekLabel(weekNumber: number, lang: "en" | "cn" = "cn"): string {
  return lang === "en" ? `Week ${weekNumber}` : `${weekNumber}周`;
}

/** Week numbers whose Saturday start falls in the given calendar month. */
export function weeksInCalendarMonth(year: number, month: number): number[] {
  const weeks: number[] = [];
  for (let weekNumber = 1; weekNumber <= 53; weekNumber += 1) {
    const { startsOn } = weekDateRange(year, weekNumber);
    const start = new Date(`${startsOn}T00:00:00`);
    if (start.getFullYear() === year && start.getMonth() + 1 === month) {
      weeks.push(weekNumber);
    }
  }
  return weeks;
}

export function monthLabel(year: number, month: number, lang: "en" | "cn" = "en"): string {
  if (lang === "cn") return `${year}年${month}月`;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en", { month: "long", year: "numeric" });
}

export function parseCompletionRate(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  const clamped = Math.min(1, Math.max(0, num));
  return Math.round(clamped * 10000) / 10000;
}

export function formatRatePercent(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${Math.round(rate * 100)}%`;
}

/** Week number (1–53) for a date in the Saturday–Friday calendar. */
export function getWeekNumberForDate(date: Date = new Date()): number {
  const year = date.getFullYear();
  const anchor = getYearAnchorSaturday(year);
  const diffDays = Math.floor((date.getTime() - anchor.getTime()) / 86_400_000);
  if (diffDays < 0) return 1;
  return Math.min(53, Math.floor(diffDays / 7) + 1);
}

export function getPreviousWeek(year: number, weekNumber: number): { year: number; weekNumber: number } | null {
  if (weekNumber > 1) return { year, weekNumber: weekNumber - 1 };
  return null;
}

/** Max selectable week for a calendar year (past: 53, current: today, future: none). */
export function getMaxSelectableWeek(year: number, asOf: Date = new Date()): number {
  const currentYear = asOf.getFullYear();
  if (year < currentYear) return 53;
  if (year > currentYear) return 0;
  return getWeekNumberForDate(asOf);
}

/** Calendar weeks 1..max for year, merged with DB weeks, descending. */
export function mergeSelectableWeekNumbers(
  year: number,
  dbWeekNumbers: number[] = [],
  asOf: Date = new Date()
): number[] {
  const set = new Set(dbWeekNumbers.filter((w) => Number.isInteger(w) && w >= 1 && w <= 53));
  const maxWeek = getMaxSelectableWeek(year, asOf);
  for (let w = 1; w <= maxWeek; w += 1) set.add(w);
  return Array.from(set).sort((a, b) => b - a);
}
