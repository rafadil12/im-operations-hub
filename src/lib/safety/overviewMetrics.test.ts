import { describe, expect, it } from "vitest";
import { computeSafetyOverviewMetrics } from "./overviewMetrics";
import { WEEKLY_ACTIVITY_NAMES, MONTHLY_ACTIVITY_NAMES } from "./overviewData";
import type { SafetyRow } from "./types";

function weeklyRow(
  overrides: Partial<SafetyRow> & { week: number; activity_type: string; status: string }
): SafetyRow {
  return {
    id: overrides.id ?? 1,
    year: 2026,
    month: 3,
    pic: "Alice",
    location: "Plant A",
    ...overrides,
  };
}

function monthlyRow(
  overrides: Partial<SafetyRow> & { activity_type: string; status: string }
): SafetyRow {
  return {
    id: overrides.id ?? 100,
    year: 2026,
    month: 3,
    week: null,
    pic: "Alice",
    location: "Plant A",
    ...overrides,
  };
}

describe("computeSafetyOverviewMetrics", () => {
  it("defaults pic/location and zero metrics when there are no rows", () => {
    const metrics = computeSafetyOverviewMetrics({
      weeklyRows: [],
      monthlyRows: [],
      selectedYear: 2026,
      selectedMonth: 3,
      safetyLanguage: "en",
    });

    expect(metrics.pic).toBe("IT Team");
    expect(metrics.location).toBe("IT Department");
    expect(metrics.weeklyTarget).toBe(WEEKLY_ACTIVITY_NAMES.length * 4);
    expect(metrics.weeklyCompleted).toBe(0);
    expect(metrics.weeklyCompletion).toBe(0);
    expect(metrics.monthlyTarget).toBe(
      MONTHLY_ACTIVITY_NAMES.reduce((sum, a) => sum + (a.id === "reward-finding" ? 2 : 1), 0)
    );
    expect(metrics.closed).toBe(0);
    expect(metrics.closureRate).toBe(0);
    expect(metrics.trainingTarget).toBe(4);
    expect(metrics.trainingCompleted).toBe(0);
  });

  it("counts weekly completion per activity once per week", () => {
    const weeklyRows = [
      weeklyRow({ id: 1, week: 1, activity_type: "training", status: "completed" }),
      weeklyRow({ id: 2, week: 1, activity_type: "training", status: "completed" }),
      weeklyRow({ id: 3, week: 1, activity_type: "five_s", status: "not_applicable" }),
      weeklyRow({ id: 4, week: 2, activity_type: "ert", status: "not_submitted" }),
    ];

    const metrics = computeSafetyOverviewMetrics({
      weeklyRows,
      monthlyRows: [],
      selectedYear: 2026,
      selectedMonth: 3,
      safetyLanguage: "en",
    });

    const w1 = metrics.weeklyTrend.find((w) => w.week === 1);
    expect(w1?.completed).toBe(2);
    expect(w1?.total).toBe(WEEKLY_ACTIVITY_NAMES.length);
    expect(w1?.rate).toBe(Math.round((2 / WEEKLY_ACTIVITY_NAMES.length) * 100));
    expect(w1?.cleaning).toBe(1);
    // training counter is row-based (two completed training rows in W1)
    expect(w1?.training).toBe(2);

    expect(metrics.weeklyCompleted).toBe(2);
    expect(metrics.hazardFinding).toBe(0);
    expect(metrics.cleaningFinding).toBe(1);
  });

  it("computes monthly activity rates including reward target of 2 and hazard-case", () => {
    const monthlyRows = [
      monthlyRow({ id: 1, activity_type: "fire_drill", status: "completed" }),
      monthlyRow({ id: 2, activity_type: "reward_finding", status: "completed" }),
      monthlyRow({ id: 3, activity_type: "reward_finding", status: "completed" }),
      monthlyRow({ id: 4, activity_type: "reward_finding", status: "completed" }),
      monthlyRow({ id: 5, activity_type: "safety_case", status: "case_found" }),
    ];

    const metrics = computeSafetyOverviewMetrics({
      weeklyRows: [],
      monthlyRows,
      selectedYear: 2026,
      selectedMonth: 3,
      safetyLanguage: "en",
    });

    const fire = metrics.monthlyActivityData.find((a) => a.id === "fire-drill");
    const reward = metrics.monthlyActivityData.find((a) => a.id === "reward-finding");
    const hazard = metrics.monthlyActivityData.find((a) => a.id === "hazard-case");

    expect(fire?.completed).toBe(1);
    expect(fire?.target).toBe(1);
    expect(fire?.rate).toBe(100);

    expect(reward?.completed).toBe(2);
    expect(reward?.target).toBe(2);
    expect(reward?.rate).toBe(100);

    expect(hazard?.completed).toBe(-1);
    expect(hazard?.rate).toBe(-100);

    expect(metrics.closed).toBe(4);
    expect(metrics.inProgress).toBe(1);
    expect(metrics.closureRate).toBe(Math.round((4 / 5) * 100));
  });

  it("derives training weeks and safety score from completion + closure + training", () => {
    const weeklyRows = [
      weeklyRow({ id: 1, week: 1, activity_type: "training", status: "completed" }),
      weeklyRow({ id: 2, week: 2, activity_type: "training", status: "completed" }),
      weeklyRow({ id: 3, week: 3, activity_type: "training", status: "not_submitted" }),
    ];

    const metrics = computeSafetyOverviewMetrics({
      weeklyRows,
      monthlyRows: [],
      selectedYear: 2026,
      selectedMonth: 3,
      safetyLanguage: "en",
    });

    expect(metrics.trainingCompleted).toBe(2);
    expect(metrics.trainingRate).toBe(50);
    expect(metrics.recentTraining).toHaveLength(3);
    expect(metrics.safetyScore).toBe(
      Math.round(metrics.overallCompletion * 0.5 + metrics.closureRate * 0.3 + metrics.trainingRate * 0.2)
    );
  });

  it("collects unique pic and location lists from rows", () => {
    const metrics = computeSafetyOverviewMetrics({
      weeklyRows: [
        weeklyRow({
          id: 1,
          week: 1,
          activity_type: "training",
          status: "completed",
          pic: "Bob",
          location: "Line 1",
        }),
      ],
      monthlyRows: [
        monthlyRow({
          id: 2,
          activity_type: "fire_drill",
          status: "completed",
          pic: "Carol",
          location: "Line 2",
        }),
      ],
      selectedYear: 2026,
      selectedMonth: 3,
      safetyLanguage: "en",
    });

    expect(metrics.picList).toEqual(expect.arrayContaining(["Bob", "Carol"]));
    expect(metrics.locationList).toEqual(expect.arrayContaining(["Line 1", "Line 2"]));
    expect(metrics.pic).toBe(metrics.picList[0]);
    expect(metrics.location).toBe(metrics.locationList[0]);
  });
});
