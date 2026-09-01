import { safetyText } from "./copy";
import { normalizeActivity } from "./mappers";
import type { ApiResponse, SafetyLanguage } from "./types";

export const CHART_ANIMATION_DURATION = 1800;

export const CHART_ANIMATION_EASING = "ease-in-out" as const;

export const MONTHLY_ACTIVITY_NAMES = [
  {
    id: "fire-drill",
    names: ["fire_drill", "fire-drill", "fire drill", "fire"],
    title: "Fire Drill",
    icon: "🔥",
  },
  {
    id: "monthly-meeting",
    names: ["monthly_meeting", "monthly-meeting", "monthly meeting", "meeting"],
    title: "Monthly Meeting",
    icon: "👥",
  },
  {
    id: "hazard-case",
    names: ["hazard_case", "safety_case", "hazard-case", "safety case", "hazard"],
    title: "Safety Case",
    icon: "⚠️",
  },
  {
    id: "safety-ppt",
    names: ["safety_ppt", "monthly_ppt", "safety-ppt", "safety ppt", "ppt"],
    title: "Safety PPT",
    icon: "📊",
  },
  {
    id: "reward-finding",
    names: ["reward_finding", "reward-finding", "reward finding", "reward"],
    title: "Reward Finding",
    icon: "🏆",
  },
];

export const WEEKLY_ACTIVITY_NAMES = [
  {
    id: "training",
    names: ["training", "safety_training", "safety-training", "safety training"],
    title: "Safety Training",
    icon: "🎓",
  },
  {
    id: "hse",
    names: ["hse", "hse_tuesday", "hse-tuesday", "hse tuesday"],
    title: "HSE Tuesday",
    icon: "🦺",
  },
  {
    id: "ert",
    names: ["ert", "ert_report", "ert-report"],
    title: "ERT",
    icon: "🚨",
  },
  {
    id: "five-s",
    names: ["five_s", "five-s", "5s", "cleaning", "cleaning_finding", "cleaning-finding"],
    title: "5S / Cleaning",
    icon: "🧹",
  },
  {
    id: "hazard",
    names: [
      "hazard",
      "potential_hazard",
      "potential-hazard",
      "potential hazard",
      "hazard_finding",
      "hazard-finding",
    ],
    title: "Hazard Finding",
    icon: "⚠️",
  },
  {
    id: "bbs",
    names: ["bbs", "routine_meeting", "routine-meeting", "routine meeting", "routine"],
    title: "BBS",
    icon: "👀",
  },
];

export async function getSafetyData(year: number, month: number) {
  try {
    const [weeklyResponse, monthlyResponse] = await Promise.all([
      fetch(
        `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/safety/weekly?year=${year}&month=${month}`,
        {
          cache: "no-store",
        }
      ),
      fetch(
        `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/safety/monthly?year=${year}&month=${month}`,
        {
          cache: "no-store",
        }
      ),
    ]);

    const weekly = (await weeklyResponse.json()) as ApiResponse;
    const monthly = (await monthlyResponse.json()) as ApiResponse;

    if (!weeklyResponse.ok) {
      throw new Error(weekly.error ?? weekly.message ?? "Failed to load weekly safety data.");
    }

    if (!monthlyResponse.ok) {
      throw new Error(monthly.error ?? monthly.message ?? "Failed to load monthly safety data.");
    }

    return {
      weeklyRows: Array.isArray(weekly.data) ? weekly.data : [],
      monthlyRows: Array.isArray(monthly.data) ? monthly.data : [],
    };
  } catch (error) {
    console.error("SAFETY OVERVIEW DATA ERROR:", error);

    return {
      weeklyRows: [],
      monthlyRows: [],
    };
  }
}

export function getActivityTitle(activity?: string, language: SafetyLanguage = "en") {
  const normalized = normalizeActivity(activity);

  const all = [...WEEKLY_ACTIVITY_NAMES, ...MONTHLY_ACTIVITY_NAMES];

  const found = all.find((item) =>
    item.names.some((name) => normalizeActivity(name) === normalized)
  );

  if (!found) {
    return activity ?? safetyText("safetyActivity", language);
  }

  const titles: Record<string, string> = {
    "fire-drill": safetyText("fireDrill", language),
    "monthly-meeting": safetyText("monthlyMeeting", language),
    "hazard-case": safetyText("safetyCase", language),
    "safety-ppt": safetyText("safetyPpt", language),
    "reward-finding": safetyText("rewardFinding", language),
    training: safetyText("safetyTraining", language),
    hse: safetyText("hseTuesday", language),
    ert: safetyText("ert", language),
    "five-s": safetyText("fiveSCleaning", language),
    hazard: safetyText("hazardFinding", language),
    bbs: safetyText("bbs", language),
  };

  return titles[found.id] ?? found.title;
}
