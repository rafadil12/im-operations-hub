import { describe, expect, it } from "vitest";
import {
  getMaxSelectableWeek,
  mergeSelectableWeekNumbers,
  weekDateRange,
  weeksEndingInCalendarMonth,
  weeksInCalendarMonth,
} from "./weekCalendar";

const asOf = new Date(2026, 8, 1); // Sep 1, 2026 (Tuesday)

describe("mergeSelectableWeekNumbers", () => {
  it("includes calendar weeks through the current week for the current year", () => {
    const options = mergeSelectableWeekNumbers(2026, [], asOf);
    expect(options[0]).toBe(getMaxSelectableWeek(2026, asOf));
    expect(options).toContain(1);
    expect(options).not.toContain(getMaxSelectableWeek(2026, asOf) + 1);
  });

  it("merges DB weeks with calendar weeks", () => {
    const options = mergeSelectableWeekNumbers(2026, [40], asOf);
    expect(options).toContain(40);
    expect(options).toContain(getMaxSelectableWeek(2026, asOf));
  });

  it("allows weeks 1–53 for past years", () => {
    const options = mergeSelectableWeekNumbers(2025, [], asOf);
    expect(options).toEqual(Array.from({ length: 53 }, (_, i) => 53 - i));
  });
});

describe("weeksEndingInCalendarMonth", () => {
  it("assigns September 2026 weeks by Friday end: 36–39", () => {
    expect(weeksEndingInCalendarMonth(2026, 9)).toEqual([36, 37, 38, 39]);
    expect(weekDateRange(2026, 36).endsOn).toBe("2026-09-04");
    expect(weekDateRange(2026, 40).endsOn).toBe("2026-10-02");
  });

  it("assigns October 2026 weeks by Friday end: 40–44 (5 Fridays)", () => {
    expect(weeksEndingInCalendarMonth(2026, 10)).toEqual([40, 41, 42, 43, 44]);
  });

  it("keeps Saturday-start months different from Friday-end months", () => {
    expect(weeksInCalendarMonth(2026, 9)).toEqual([37, 38, 39, 40]);
  });
});
