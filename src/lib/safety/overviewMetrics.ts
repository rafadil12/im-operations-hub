import { MONTHLY_ACTIVITY_NAMES, WEEKLY_ACTIVITY_NAMES } from "./overviewData";
import { getLocalizedValue } from "./copy";
import { activityMatches, isCaseFound, isCompleted } from "./mappers";
import type { SafetyRow } from "./types";

export type WeeklyTrendItem = {
  week: number;
  label: string;
  completed: number;
  total: number;
  rate: number;
  hazard: number;
  cleaning: number;
  training: number;
};

export type MonthlyActivityMetric = {
  id: string;
  names: readonly string[];
  title: string;
  icon: string;
  completed: number;
  target: number;
  rate: number;
};

export type TrainingWeeklyItem = {
  label: string;
  completed: number;
  rate: number;
};

export type SafetyOverviewMetrics = {
  monthLabel: string;
  picList: string[];
  locationList: string[];
  pic: string;
  location: string;
  weeklyTrend: WeeklyTrendItem[];
  weeklyCompleted: number;
  weeklyTarget: number;
  weeklyCompletion: number;
  monthlyActivityData: MonthlyActivityMetric[];
  monthlyCompleted: number;
  monthlyTarget: number;
  overallCompleted: number;
  overallTarget: number;
  overallCompletion: number;
  hazardFinding: number;
  cleaningFinding: number;
  totalFinding: number;
  closed: number;
  open: number;
  inProgress: number;
  totalStatus: number;
  closureRate: number;
  trainingWeekly: TrainingWeeklyItem[];
  trainingCompleted: number;
  trainingTarget: number;
  trainingRate: number;
  safetyScore: number;
  actionRows: SafetyRow[];
  recentTraining: SafetyRow[];
};

type ComputeSafetyOverviewMetricsInput = {
  weeklyRows: SafetyRow[];
  monthlyRows: SafetyRow[];
  selectedYear: number;
  selectedMonth: number;
  safetyLanguage: "en" | "cn";
};

const WEEKLY_WEEKS = [1, 2, 3, 4] as const;

const HAZARD_NAMES = ["hazard", "potential_hazard", "hazard_finding", "hazard-finding"] as const;

const CLEANING_NAMES = ["five_s", "5s", "cleaning", "cleaning_finding"] as const;

const TRAINING_NAMES = ["training", "safety_training"] as const;

function getLatestActivityRow(rows: SafetyRow[], names: readonly string[]): SafetyRow | undefined {
  return rows
    .filter((row) => activityMatches(row, names))
    .sort((a, b) => Number(b.id) - Number(a.id))[0];
}

function getActionSourceRow(rows: SafetyRow[], names: readonly string[]): SafetyRow | undefined {
  const activityRows = rows.filter((row) => activityMatches(row, names));

  const pendingRow = activityRows
    .filter((row) => row.status === "not_submitted" || row.status === "case_found")
    .sort((a, b) => Number(b.id) - Number(a.id))[0];

  return pendingRow ?? getLatestActivityRow(rows, names);
}

function computeActionRequiredRows(
  weeklyRows: SafetyRow[],
  monthlyRows: SafetyRow[],
  allRows: SafetyRow[],
  selectedYear: number,
  selectedMonth: number,
  pic: string,
  location: string
): SafetyRow[] {
  const today = new Date();
  const isActionRequiredCutoffReached = today.getDate() >= 20;

  const actionRequiredRows: SafetyRow[] = [];

  if (isActionRequiredCutoffReached) {
    WEEKLY_WEEKS.forEach((week) => {
      const weekRows = weeklyRows.filter((row) => Number(row.week) === week);

      WEEKLY_ACTIVITY_NAMES.forEach((activity) => {
        const completed = weekRows.some(
          (row) => activityMatches(row, activity.names) && isCompleted(row)
        );

        const caseFound = weekRows.some(
          (row) => activityMatches(row, activity.names) && isCaseFound(row)
        );

        if (!completed) {
          const existingRow = getActionSourceRow(weekRows, activity.names);

          if (existingRow) {
            actionRequiredRows.push({
              ...existingRow,
              week,
              status: caseFound
                ? "case_found"
                : existingRow.status === "case_found"
                  ? "case_found"
                  : "not_submitted",
            });
          } else {
            actionRequiredRows.push({
              id: -(week * 100 + actionRequiredRows.length + 1),
              year: selectedYear,
              month: selectedMonth,
              week,
              activity_type: activity.names[0],
              status: caseFound ? "case_found" : "not_submitted",
              pic: pic ?? "IT Team",
              location: location ?? "IT Department",
              description: undefined,
              pic_en: undefined,
              pic_cn: undefined,
              description_en: undefined,
              description_cn: undefined,
            });
          }
        }
      });
    });

    MONTHLY_ACTIVITY_NAMES.forEach((activity) => {
      const rows = monthlyRows.filter((row) => activityMatches(row, activity.names));

      const target = activity.id === "reward-finding" ? 2 : 1;

      const completedCount =
        activity.id === "reward-finding"
          ? Math.min(rows.filter((row) => row.status === "completed").length, target)
          : rows.filter((row) => isCompleted(row)).length;

      const caseFound = rows.some((row) => row.status === "case_found");

      if (caseFound) {
        const caseRow = rows.find((row) => row.status === "case_found");

        actionRequiredRows.push({
          ...(caseRow ?? {
            id: -(5000 + actionRequiredRows.length + 1),
            year: selectedYear,
            month: selectedMonth,
            activity_type: activity.names[0],
          }),
          status: "case_found",
        });
      }

      if (!caseFound && completedCount < target) {
        const missingCount = target - completedCount;
        const existingNotSubmitted = rows
          .filter((row) => row.status === "not_submitted")
          .sort((a, b) => Number(b.id) - Number(a.id));

        const latestActivityRow = getLatestActivityRow(rows, activity.names);

        for (let i = 0; i < missingCount; i += 1) {
          const existingRow = existingNotSubmitted[i] ?? latestActivityRow;

          actionRequiredRows.push({
            ...(existingRow ?? {
              id: -(6000 + actionRequiredRows.length + 1),
              year: selectedYear,
              month: selectedMonth,
              activity_type: activity.names[0],
              pic: pic ?? "IT Team",
              location: location ?? "IT Department",
            }),
            status: "not_submitted",
          });
        }
      }
    });
  } else {
    actionRequiredRows.push(
      ...allRows.filter((row) => row.status === "not_submitted" || row.status === "case_found")
    );
  }

  return actionRequiredRows.sort((a, b) => {
    const weekA = Number(a.week ?? 99);
    const weekB = Number(b.week ?? 99);

    if (weekA !== weekB) {
      return weekA - weekB;
    }

    return Number(b.id) - Number(a.id);
  });
}

export function computeSafetyOverviewMetrics({
  weeklyRows,
  monthlyRows,
  selectedYear,
  selectedMonth,
  safetyLanguage,
}: ComputeSafetyOverviewMetricsInput): SafetyOverviewMetrics {
  const allRows = [...weeklyRows, ...monthlyRows];

  const monthLabel = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString(
    safetyLanguage === "cn" ? "zh-CN" : "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );

  const picList = Array.from(
    new Set(
      allRows
        .map((row) => getLocalizedValue(row.pic_en ?? row.pic, row.pic_cn, safetyLanguage))
        .filter((value) => value && value !== "—")
    )
  );

  const locationList = Array.from(
    new Set(allRows.map((row) => row.location?.trim()).filter(Boolean) as string[])
  );

  const pic = picList.length > 0 ? picList[0] : "IT Team";

  const location = locationList.length > 0 ? locationList[0] : "IT Department";

  const weeklyTrend = WEEKLY_WEEKS.map((week) => {
    const rows = weeklyRows.filter((row) => Number(row.week) === week);

    const completed = WEEKLY_ACTIVITY_NAMES.filter((activity) =>
      rows.some((row) => activityMatches(row, activity.names) && isCompleted(row))
    ).length;

    const total = WEEKLY_ACTIVITY_NAMES.length;

    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const hazard = rows.filter(
      (row) => activityMatches(row, HAZARD_NAMES) && isCompleted(row)
    ).length;

    const cleaning = rows.filter(
      (row) => activityMatches(row, CLEANING_NAMES) && isCompleted(row)
    ).length;

    const training = rows.filter(
      (row) => activityMatches(row, TRAINING_NAMES) && isCompleted(row)
    ).length;

    return {
      week,
      label: `W${week}`,
      completed,
      total,
      rate,
      hazard,
      cleaning,
      training,
    };
  });

  const weeklyCompleted = weeklyTrend.reduce((sum, item) => sum + item.completed, 0);

  const weeklyTarget = weeklyTrend.reduce((sum, item) => sum + item.total, 0);

  const weeklyCompletion =
    weeklyTarget > 0 ? Math.round((weeklyCompleted / weeklyTarget) * 100) : 0;

  const monthlyActivityData = MONTHLY_ACTIVITY_NAMES.map((activity) => {
    const rows = monthlyRows.filter((row) => activityMatches(row, activity.names));

    const target = activity.id === "reward-finding" ? 2 : 1;

    const completed =
      activity.id === "reward-finding"
        ? Math.min(rows.filter((row) => row.status === "completed").length, 2)
        : activity.id === "hazard-case"
          ? rows.some((row) => row.status === "case_found")
            ? -1
            : 1
          : rows.some((row) => isCompleted(row))
            ? 1
            : 0;

    const rate =
      activity.id === "hazard-case"
        ? completed === -1
          ? -100
          : 100
        : Math.round((completed / target) * 100);

    return {
      ...activity,
      completed,
      target,
      rate,
    };
  });

  const monthlyCompleted = monthlyActivityData.reduce((sum, item) => sum + item.completed, 0);

  const monthlyTarget = monthlyActivityData.reduce((sum, item) => sum + item.target, 0);

  const overallCompleted = weeklyCompleted + monthlyCompleted;

  const overallTarget = weeklyTarget + monthlyTarget;

  const overallCompletion =
    overallTarget > 0 ? Math.round((overallCompleted / overallTarget) * 100) : 0;

  const hazardFinding = weeklyRows.filter(
    (row) =>
      activityMatches(row, ["hazard", "potential_hazard", "hazard_finding"]) && isCompleted(row)
  ).length;

  const cleaningFinding = weeklyRows.filter(
    (row) =>
      activityMatches(row, ["five_s", "5s", "cleaning", "cleaning_finding"]) && isCompleted(row)
  ).length;

  const totalFinding = hazardFinding + cleaningFinding;

  const closed = allRows.filter((row) => row.status === "completed").length;

  const open = allRows.filter((row) => row.status === "not_submitted").length;

  const inProgress = allRows.filter((row) => row.status === "case_found").length;

  const totalStatus = closed + open + inProgress;

  const closureRate = totalStatus > 0 ? Math.round((closed / totalStatus) * 100) : 0;

  const trainingWeekly = weeklyTrend.map((item) => ({
    label: item.label,
    completed: item.training,
    rate: item.training > 0 ? 100 : 0,
  }));

  const trainingCompleted = trainingWeekly.filter((item) => item.completed > 0).length;

  const trainingTarget = trainingWeekly.length;

  const trainingRate =
    trainingTarget > 0 ? Math.round((trainingCompleted / trainingTarget) * 100) : 0;

  const safetyScore = Math.round(overallCompletion * 0.5 + closureRate * 0.3 + trainingRate * 0.2);

  const actionRows = computeActionRequiredRows(
    weeklyRows,
    monthlyRows,
    allRows,
    selectedYear,
    selectedMonth,
    pic,
    location
  );

  const recentTraining = weeklyRows
    .filter((row) => activityMatches(row, TRAINING_NAMES))
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 6);

  return {
    monthLabel,
    picList,
    locationList,
    pic,
    location,
    weeklyTrend,
    weeklyCompleted,
    weeklyTarget,
    weeklyCompletion,
    monthlyActivityData,
    monthlyCompleted,
    monthlyTarget,
    overallCompleted,
    overallTarget,
    overallCompletion,
    hazardFinding,
    cleaningFinding,
    totalFinding,
    closed,
    open,
    inProgress,
    totalStatus,
    closureRate,
    trainingWeekly,
    trainingCompleted,
    trainingTarget,
    trainingRate,
    safetyScore,
    actionRows,
    recentTraining,
  };
}
