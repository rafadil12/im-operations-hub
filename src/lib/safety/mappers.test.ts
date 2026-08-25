import { describe, expect, it } from "vitest";
import {
  activityMatches,
  isCompleted,
  isCaseFound,
  normalizeActivity,
  uiActivityToDatabaseActivity,
  databaseActivityToUiActivity,
} from "./mappers";
import type { SafetyRow } from "./types";

function row(overrides: Partial<SafetyRow> = {}): SafetyRow {
  return {
    id: 1,
    activity_type: "training",
    status: "completed",
    ...overrides,
  };
}

describe("normalizeActivity", () => {
  it("trims, lowercases, and collapses separators to underscores", () => {
    expect(normalizeActivity("  Potential-Hazard  ")).toBe("potential_hazard");
    expect(normalizeActivity("HSE Tuesday")).toBe("hse_tuesday");
    expect(normalizeActivity("five-s")).toBe("five_s");
  });

  it("treats null/undefined as empty string", () => {
    expect(normalizeActivity(null)).toBe("");
    expect(normalizeActivity(undefined)).toBe("");
  });
});

describe("activityMatches", () => {
  it("matches when normalized names align across hyphen/underscore/space forms", () => {
    expect(activityMatches(row({ activity_type: "potential-hazard" }), ["potential_hazard"])).toBe(
      true
    );
    expect(activityMatches(row({ activity_type: "hse_tuesday" }), ["hse-tuesday", "HSE Tuesday"])).toBe(
      true
    );
  });

  it("returns false when no names match", () => {
    expect(activityMatches(row({ activity_type: "training" }), ["five_s", "ert"])).toBe(false);
  });
});

describe("isCompleted / isCaseFound", () => {
  it("treats completed and not_applicable as completed", () => {
    expect(isCompleted(row({ status: "completed" }))).toBe(true);
    expect(isCompleted(row({ status: "not_applicable" }))).toBe(true);
    expect(isCompleted(row({ status: "not_submitted" }))).toBe(false);
    expect(isCompleted(row({ status: "case_found" }))).toBe(false);
  });

  it("detects case_found separately", () => {
    expect(isCaseFound(row({ status: "case_found" }))).toBe(true);
    expect(isCaseFound(row({ status: "completed" }))).toBe(false);
  });
});

describe("uiActivityToDatabaseActivity", () => {
  it("maps weekly UI ids to DB snake_case values", () => {
    expect(uiActivityToDatabaseActivity("routine-meeting")).toBe("routine_meeting");
    expect(uiActivityToDatabaseActivity("hse-tuesday")).toBe("hse_tuesday");
    expect(uiActivityToDatabaseActivity("five-s")).toBe("five_s");
    expect(uiActivityToDatabaseActivity("potential-hazard")).toBe("potential_hazard");
    expect(uiActivityToDatabaseActivity("training")).toBe("training");
    expect(uiActivityToDatabaseActivity("ert")).toBe("ert");
  });

  it("maps monthly UI ids including renamed DB codes", () => {
    expect(uiActivityToDatabaseActivity("monthly-meeting")).toBe("monthly_meeting");
    expect(uiActivityToDatabaseActivity("fire-drill")).toBe("fire_drill");
    expect(uiActivityToDatabaseActivity("hazard-case")).toBe("safety_case");
    expect(uiActivityToDatabaseActivity("safety-ppt")).toBe("monthly_ppt");
    expect(uiActivityToDatabaseActivity("reward-finding")).toBe("reward_finding");
  });

  it("passes through unknown activity types", () => {
    expect(uiActivityToDatabaseActivity("custom-thing" as never)).toBe("custom-thing");
  });
});

describe("databaseActivityToUiActivity", () => {
  it("maps known DB snake_case values to UI kebab ids", () => {
    expect(databaseActivityToUiActivity("routine_meeting")).toBe("routine-meeting");
    expect(databaseActivityToUiActivity("hse_tuesday")).toBe("hse-tuesday");
    expect(databaseActivityToUiActivity("five_s")).toBe("five-s");
    expect(databaseActivityToUiActivity("potential_hazard")).toBe("potential-hazard");
  });

  it("passes through unmapped values", () => {
    expect(databaseActivityToUiActivity("training")).toBe("training");
    expect(databaseActivityToUiActivity("safety_case")).toBe("safety_case");
  });
});
