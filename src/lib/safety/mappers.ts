import type { ActivityType, SafetyLanguage, SafetyRow } from "./types";

export function formatDate(value: string, language: "en" | "cn") {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString(language === "cn" ? "zh-CN" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function defaultSafetyDateInput(year?: number, month?: number): string {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

export function convertDisplayDateToInput(value: string, fallback?: string) {
  const defaultFallback = fallback ?? new Date().toISOString().slice(0, 10);
  if (!value) return defaultFallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return defaultFallback;
  return date.toISOString().slice(0, 10);
}

export function uiActivityToDatabaseActivity(activityType: ActivityType): string {
  const map: Record<string, string> = {
    // WEEKLY
    training: "training",
    "routine-meeting": "routine_meeting",
    "hse-tuesday": "hse_tuesday",
    ert: "ert",
    "five-s": "five_s",
    "potential-hazard": "potential_hazard",

    // MONTHLY - HARUS SAMA DENGAN DATABASE
    "monthly-meeting": "monthly_meeting",
    "fire-drill": "fire_drill",
    "hazard-case": "safety_case",
    "safety-ppt": "monthly_ppt",
    "reward-finding": "reward_finding",
  };

  return map[activityType] ?? activityType;
}

export function databaseActivityToUiActivity(activityType: string): ActivityType {
  const map: Record<string, ActivityType> = {
    routine_meeting: "routine-meeting",
    hse_tuesday: "hse-tuesday",
    five_s: "five-s",
    potential_hazard: "potential-hazard",
  };

  return map[activityType] ?? (activityType as ActivityType);
}

export function normalizeActivity(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
}

export function activityMatches(row: SafetyRow, names: readonly string[]) {
  const activity = normalizeActivity(row.activity_type);

  return names.some((name) => normalizeActivity(name) === activity);
}

export function isCompleted(row: SafetyRow) {
  return row.status === "completed" || row.status === "not_applicable";
}

export function isCaseFound(row: SafetyRow) {
  return row.status === "case_found";
}

export function formatOverviewDate(value?: string | null, language: SafetyLanguage = "en") {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(language === "cn" ? "zh-CN" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
