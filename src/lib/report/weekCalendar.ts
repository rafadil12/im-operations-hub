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
