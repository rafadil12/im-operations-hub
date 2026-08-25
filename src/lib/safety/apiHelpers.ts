import { NextRequest, NextResponse } from "next/server";
import type { MonthlyActivity, MonthlyStatus } from "./monthlyConstants";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getYearMonth(request: NextRequest) {
  const url = new URL(request.url);
  const now = new Date();

  const yearParam = url.searchParams.get("year");

  const monthParam = url.searchParams.get("month");

  const year = yearParam ? Number(yearParam) : now.getFullYear();

  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Year tidak valid.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Month harus antara 1 sampai 12.");
  }

  return {
    year,
    month,
  };
}

export function normalizeMonthlyStatus(
  activityType: MonthlyActivity,
  rawStatus: unknown
): MonthlyStatus {
  /*
   * Safety Case:
   *
   * case_found     = ada case
   * not_applicable = tidak ada case
   */

  if (activityType === "safety_case") {
    const value = String(rawStatus ?? "")
      .trim()
      .toLowerCase();

    if (value === "case_found") {
      return "case_found";
    }

    if (value === "not_applicable") {
      return "not_applicable";
    }

    if (
      value === "case" ||
      value === "found" ||
      value === "yes" ||
      value === "true" ||
      value === "1"
    ) {
      return "case_found";
    }

    if (
      value === "no_case" ||
      value === "no-case" ||
      value === "none" ||
      value === "no" ||
      value === "false" ||
      value === "0"
    ) {
      return "not_applicable";
    }

    /*
     * Default Safety Case:
     * tidak ada status = No Case.
     */
    return "not_applicable";
  }

  return "completed";
}

export function normalizeWeeklyActivityType(value: string): string {
  const key = value.trim().toLowerCase().replace(/[-\s]/g, "_");

  const aliases: Record<string, string> = {
    training: "training",

    routine_meeting: "routine_meeting",

    routinemeeting: "routine_meeting",

    hse_tuesday: "hse_tuesday",

    hsetuesday: "hse_tuesday",

    ert: "ert",

    five_s: "five_s",

    fives: "five_s",

    "5s": "five_s",

    potential_hazard: "potential_hazard",

    potentialhazard: "potential_hazard",

    // Backward-compatible old names.
    hazard: "potential_hazard",

    cleaning: "five_s",
  };

  return aliases[key] ?? key;
}
