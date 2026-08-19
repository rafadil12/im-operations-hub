"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";


const CHART_ANIMATION_DURATION = 1800;
const CHART_ANIMATION_EASING = "ease-in-out" as const;

type SafetyLanguage = "en" | "cn";

const SAFETY_TEXT = {
  management: ["Safety Management", "安全管理"],
  overview: ["Safety Overview", "安全总览"],
  overviewDescription: [
    "IM Safety Training & Weekly Safety Activity Overview",
    "IM安全培训与每周安全活动总览",
  ],
  onTrack: ["On Track", "正常进行"],
  needsAttention: ["Needs Attention", "需要关注"],
  atRisk: ["At Risk", "存在风险"],
  safetyTraining: ["Safety Training", "安全培训"],
  trainingCompleted: ["Training completed", "培训已完成"],
  hazardFinding: ["Hazard Finding", "安全隐患发现"],
  cleaningFinding: ["Cleaning Finding", "清洁问题发现"],
  totalFindings: ["Total Findings", "发现总数"],
  currentMonth: ["Current month", "当前月份"],
  thisMonth: ["This month", "本月"],
  safetyMeeting: ["Safety Meeting", "安全会议"],
  monthly: ["Monthly", "每月"],
  completionRate: ["Completion Rate", "完成率"],
  overall: ["Overall", "总体"],
  safetyCompletionTrend: ["Safety Completion Trend", "安全完成趋势"],
  weeklyCompletionPerformance: ["Weekly completion performance", "每周完成情况"],
  findingStatus: ["Finding Status", "问题状态"],
  currentSafetyCaseStatus: ["Current safety case status", "当前安全案件状态"],
  closed: ["Closed", "已关闭"],
  inProgress: ["In Progress", "处理中"],
  progress: ["Progress", "进度"],
  open: ["Open", "未关闭"],
  closureRate: ["Closure Rate", "关闭率"],
  weeklyFindingTrend: ["Weekly Finding Trend", "每周问题趋势"],
  hazardAndCleaningFindings: ["Hazard and cleaning findings", "安全隐患与清洁问题发现"],
  hazard: ["Hazard", "安全隐患"],
  cleaning: ["Cleaning", "清洁"],
  weeklyRequirementCompletion: ["Weekly Requirement Completion", "每周要求完成情况"],
  completedRequirementsByWeek: ["Completed requirements by week", "按周统计已完成要求"],
  safetyTrainingPerformance: ["Safety Training Performance", "安全培训表现"],
  trainingCompletionByWeek: ["Training completion by week", "按周统计培训完成情况"],
  trainingCompletion: ["Training Completion", "培训完成情况"],
  monthlySafetyActivity: ["Monthly Safety Activity", "每月安全活动"],
  monthlyRequirementCompletion: ["Monthly requirement completion", "每月要求完成情况"],
  safetyPerformanceScore: ["Safety Performance Score", "安全绩效评分"],
  overallMonthlySafetyPerformance: ["Overall monthly safety performance", "每月整体安全绩效"],
  overallCompletion: ["Overall Completion", "总体完成率"],
  findingClosure: ["Finding Closure", "问题关闭率"],
  training: ["Training", "培训"],
  safetyScore: ["Safety Score", "安全评分"],
  weeklySafetyRequirement: ["Weekly Safety Requirement", "每周安全要求"],
  currentWeeklySafetyActivities: ["Current weekly safety activities", "当前每周安全活动"],
  weeklyCompletion: ["Weekly Completion", "每周完成情况"],
  noTrainingData: ["No training data", "暂无培训数据"],
  week: ["Week", "周次"],
  date: ["Date", "日期"],
  pic: ["PIC", "负责人"],
  location: ["Location", "地点"],
  status: ["Status", "状态"],
  trainingAttendance: ["Training Attendance", "培训出席情况"],
  actionRequired: ["Action Required", "需要处理"],
  activitiesNeedAttention: ["Activities that need attention", "需要关注和处理的安全活动"],
  noActionRequired: ["✓ No action required", "✓ 无需处理"],
  allActivitiesOnTrack: ["All safety activities are on track.", "所有安全活动均正常进行。"],
  safetyCaseNeedsAttention: ["Safety case requires attention.", "安全案件需要关注。"],
  activityNotSubmitted: ["Safety activity has not been submitted.", "安全活动尚未提交。"],
  total: ["Total", "总计"],
  safetyActivity: ["Safety Activity", "安全活动"],
  itSafetyManagementSystem: ["IT Safety Management System", "IT安全管理系统"],
  fireDrill: ["Fire Drill", "消防演练"],
  monthlyMeeting: ["Monthly Meeting", "月度会议"],
  safetyCase: ["Safety Case", "安全案件"],
  safetyPpt: ["Safety PPT", "安全PPT"],
  rewardFinding: ["Reward Finding", "奖励发现"],
  hseTuesday: ["HSE Tuesday", "HSE星期二"],
  ert: ["ERT", "ERT"],
  fiveSCleaning: ["5S / Cleaning", "5S / 清洁"],
  bbs: ["BBS", "BBS"],
} as const;

function safetyText(
  key: keyof typeof SAFETY_TEXT,
  language: SafetyLanguage,
): string {
  return SAFETY_TEXT[key][language === "cn" ? 1 : 0];
}

type SafetyStatus =
  | "completed"
  | "not_submitted"
  | "not_applicable"
  | "case_found";

type SafetyRow = {
  id: number;
  year?: number;
  month?: number;
  week?: number | null;
  activity_type?: string;
  status?: SafetyStatus | string;
  submission_date?: string | null;
  pic?: string | null;
  location?: string | null;
  description?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  files?: unknown[];
};

type ApiResponse = {
  success?: boolean;
  data?: SafetyRow[];
  message?: string;
};

const MONTHLY_ACTIVITY_NAMES = [
  {
    id: "fire-drill",
    names: [
      "fire_drill",
      "fire-drill",
      "fire drill",
      "fire",
    ],
    title: "Fire Drill",
    icon: "🔥",
  },
  {
    id: "monthly-meeting",
    names: [
      "monthly_meeting",
      "monthly-meeting",
      "monthly meeting",
      "meeting",
    ],
    title: "Monthly Meeting",
    icon: "👥",
  },
  {
    id: "hazard-case",
    names: [
      "hazard_case",
      "safety_case",
      "hazard-case",
      "safety case",
      "hazard",
    ],
    title: "Safety Case",
    icon: "⚠️",
  },
  {
    id: "safety-ppt",
    names: [
      "safety_ppt",
      "monthly_ppt",
      "safety-ppt",
      "safety ppt",
      "ppt",
    ],
    title: "Safety PPT",
    icon: "📊",
  },
  {
    id: "reward-finding",
    names: [
      "reward_finding",
      "reward-finding",
      "reward finding",
      "reward",
    ],
    title: "Reward Finding",
    icon: "🏆",
  },
];

const WEEKLY_ACTIVITY_NAMES = [
  {
    id: "training",
    names: [
      "training",
      "safety_training",
      "safety-training",
      "safety training",
    ],
    title: "Safety Training",
    icon: "🎓",
  },
  {
    id: "hse",
    names: [
      "hse",
      "hse_tuesday",
      "hse-tuesday",
      "hse tuesday",
    ],
    title: "HSE Tuesday",
    icon: "🦺",
  },
  {
    id: "ert",
    names: [
      "ert",
      "ert_report",
      "ert-report",
    ],
    title: "ERT",
    icon: "🚨",
  },
  {
    id: "five-s",
    names: [
      "five_s",
      "five-s",
      "5s",
      "cleaning",
      "cleaning_finding",
      "cleaning-finding",
    ],
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
    names: [
      "bbs",
      "routine_meeting",
      "routine-meeting",
      "routine meeting",
      "routine",
    ],
    title: "BBS",
    icon: "👀",
  },
];

function normalizeActivity(
  value: string | undefined,
) {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/-/g, "_");
}

function activityMatches(
  row: SafetyRow,
  names: string[],
) {
  const activity = normalizeActivity(
    row.activity_type,
  );

  return names.some(
    (name) =>
      normalizeActivity(name) ===
      activity,
  );
}

function isCompleted(
  row: SafetyRow,
) {
  return (
    row.status === "completed" ||
    row.status === "not_applicable"
  );
}

function isCaseFound(
  row: SafetyRow,
) {
  return row.status === "case_found";
}

async function getSafetyData(
  year: number,
  month: number,
) {

  try {
    const [
      weeklyResponse,
      monthlyResponse,
    ] = await Promise.all([
      fetch(
        `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/safety/weekly?year=${year}&month=${month}`,
        {
          cache: "no-store",
        },
      ),
      fetch(
        `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/safety/monthly?year=${year}&month=${month}`,
        {
          cache: "no-store",
        },
      ),
    ]);

    const weekly =
      (await weeklyResponse.json()) as ApiResponse;

    const monthly =
      (await monthlyResponse.json()) as ApiResponse;

    return {
      weeklyRows:
        Array.isArray(weekly.data)
          ? weekly.data
          : [],
      monthlyRows:
        Array.isArray(monthly.data)
          ? monthly.data
          : [],
    };
  } catch (error) {
    console.error(
      "SAFETY OVERVIEW DATA ERROR:",
      error,
    );

    return {
      weeklyRows: [],
      monthlyRows: [],
    };
  }
}

export default function SafetyOverviewPage() {
  const { t } = useLang();

  // Bulan aktif untuk seluruh dashboard.
  const initialDate = new Date();

  const [selectedYear, setSelectedYear] = useState(
    initialDate.getFullYear(),
  );

  const [selectedMonth, setSelectedMonth] = useState(
    initialDate.getMonth() + 1,
  );

  const safetyLanguage: SafetyLanguage =
    t.safety.management === "安全管理"
      ? "cn"
      : "en";

  const [weeklyRows, setWeeklyRows] =
    useState<SafetyRow[]>([]);

  const [monthlyRows, setMonthlyRows] =
    useState<SafetyRow[]>([]);

  useEffect(() => {
    let active = true;

    getSafetyData(
      selectedYear,
      selectedMonth,
    ).then((data) => {
      if (!active) return;

      setWeeklyRows(data.weeklyRows);
      setMonthlyRows(data.monthlyRows);
    });

    return () => {
      active = false;
    };
  }, [selectedYear, selectedMonth]);
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".safety-scroll-animate",
      ),
    );

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;

          if (entry.isIntersecting) {
            element.classList.add("is-visible");
          } else {
            // Remove the class when leaving the viewport so the animation
            // starts again when the user scrolls back up.
            element.classList.remove("is-visible");
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const allRows = [
    ...weeklyRows,
    ...monthlyRows,
  ];

  /*
   * =====================================================
   * BASIC INFO
   * =====================================================
   */

  const monthLabel =
    new Date(
      selectedYear,
      selectedMonth - 1,
      1,
    ).toLocaleDateString(
      safetyLanguage === "cn" ? "zh-CN" : "en-US",
      {
        month: "long",
        year: "numeric",
      },
    );

  const picList =
    Array.from(
      new Set(
        allRows
          .map((row) =>
            row.pic?.trim(),
          )
          .filter(Boolean),
      ),
    );

  const locationList =
    Array.from(
      new Set(
        allRows
          .map((row) =>
            row.location?.trim(),
          )
          .filter(Boolean),
      ),
    );

  const pic =
    picList.length > 0
      ? picList[0]
      : "IT Team";

  const location =
    locationList.length > 0
      ? locationList[0]
      : "IT Department";

  /*
   * =====================================================
   * WEEKLY
   * =====================================================
   */

  const weeklyWeeks = [
    1,
    2,
    3,
    4,
  ];

  const weeklyTrend =
    weeklyWeeks.map(
      (week) => {
        const rows =
          weeklyRows.filter(
            (row) =>
              Number(row.week) ===
              week,
          );

        const completed =
          WEEKLY_ACTIVITY_NAMES.filter(
            (activity) =>
              rows.some(
                (row) =>
                  activityMatches(
                    row,
                    activity.names,
                  ) &&
                  isCompleted(row),
              ),
          ).length;

        const total =
          WEEKLY_ACTIVITY_NAMES.length;

        const rate =
          total > 0
            ? Math.round(
                (completed /
                  total) *
                  100,
              )
            : 0;

        const hazard =
          rows.filter(
            (row) =>
              activityMatches(
                row,
                [
                  "hazard",
                  "potential_hazard",
                  "hazard_finding",
                  "hazard-finding",
                ],
              ) &&
              isCompleted(row),
          ).length;

        const cleaning =
          rows.filter(
            (row) =>
              activityMatches(
                row,
                [
                  "five_s",
                  "5s",
                  "cleaning",
                  "cleaning_finding",
                ],
              ) &&
              isCompleted(row),
          ).length;

        const training =
          rows.filter(
            (row) =>
              activityMatches(
                row,
                [
                  "training",
                  "safety_training",
                ],
              ) &&
              isCompleted(row),
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
      },
    );

  /*
   * =====================================================
   * WEEKLY TOTAL
   * =====================================================
   */

  const weeklyCompleted =
    weeklyTrend.reduce(
      (sum, item) =>
        sum + item.completed,
      0,
    );

  const weeklyTarget =
    weeklyTrend.reduce(
      (sum, item) =>
        sum + item.total,
      0,
    );

  const weeklyCompletion =
    weeklyTarget > 0
      ? Math.round(
          (weeklyCompleted /
            weeklyTarget) *
            100,
        )
      : 0;

  /*
   * =====================================================
   * MONTHLY
   * =====================================================
   */

  const monthlyActivityData =
    MONTHLY_ACTIVITY_NAMES.map(
      (activity) => {
        const rows =
          monthlyRows.filter(
            (row) =>
              activityMatches(
                row,
                activity.names,
              ),
          );

        const target =
          activity.id ===
          "reward-finding"
            ? 2
            : 1;

        const completed =
          activity.id ===
          "reward-finding"
            ? Math.min(
                rows.filter(
                  (row) =>
                    row.status ===
                    "completed",
                ).length,
                2,
              )
            : rows.some(
                (row) =>
                  isCompleted(row),
              )
            ? 1
            : 0;

        const rate =
          Math.round(
            (completed /
              target) *
              100,
          );

        return {
          ...activity,
          completed,
          target,
          rate,
        };
      },
    );

  const monthlyCompleted =
    monthlyActivityData.reduce(
      (sum, item) =>
        sum + item.completed,
      0,
    );

  const monthlyTarget =
    monthlyActivityData.reduce(
      (sum, item) =>
        sum + item.target,
      0,
    );

  const monthlyCompletion =
    monthlyTarget > 0
      ? Math.round(
          (monthlyCompleted /
            monthlyTarget) *
            100,
        )
      : 0;

  /*
   * =====================================================
   * OVERALL
   * =====================================================
   */

  const overallCompleted =
    weeklyCompleted +
    monthlyCompleted;

  const overallTarget =
    weeklyTarget +
    monthlyTarget;

  const overallCompletion =
    overallTarget > 0
      ? Math.round(
          (overallCompleted /
            overallTarget) *
            100,
        )
      : 0;

  /*
   * =====================================================
   * FINDINGS
   * =====================================================
   */

  const hazardFinding =
    weeklyRows.filter(
      (row) =>
        activityMatches(
          row,
          [
            "hazard",
            "potential_hazard",
            "hazard_finding",
          ],
        ) &&
        isCompleted(row),
    ).length;

  const cleaningFinding =
    weeklyRows.filter(
      (row) =>
        activityMatches(
          row,
          [
            "five_s",
            "5s",
            "cleaning",
            "cleaning_finding",
          ],
        ) &&
        isCompleted(row),
    ).length;

  const totalFinding =
    hazardFinding +
    cleaningFinding;

  /*
   * =====================================================
   * CASE STATUS
   * =====================================================
   */

  const caseFound =
    monthlyRows.filter(
      (row) =>
        isCaseFound(row),
    ).length;

  const noCase =
    monthlyRows.filter(
      (row) =>
        row.status ===
        "not_applicable",
    ).length;

  const closed =
    allRows.filter(
      (row) =>
        row.status ===
        "completed",
    ).length;

  const open =
    allRows.filter(
      (row) =>
        row.status ===
        "not_submitted",
    ).length;

  const inProgress =
    allRows.filter(
      (row) =>
        row.status ===
        "case_found",
    ).length;

  const totalStatus =
    closed +
    open +
    inProgress;

  const closureRate =
    totalStatus > 0
      ? Math.round(
          (closed /
            totalStatus) *
            100,
        )
      : 0;

  /*
   * =====================================================
   * TRAINING
   * =====================================================
   */

  const trainingWeekly =
    weeklyTrend.map(
      (item) => ({
        label: item.label,
        completed:
          item.training,
        rate:
          item.training > 0
            ? 100
            : 0,
      }),
    );

  const trainingCompleted =
    trainingWeekly.filter(
      (item) =>
        item.completed > 0,
    ).length;

  const trainingTarget =
    trainingWeekly.length;

  const trainingRate =
    trainingTarget > 0
      ? Math.round(
          (trainingCompleted /
            trainingTarget) *
            100,
        )
      : 0;

  /*
   * =====================================================
   * SAFETY SCORE
   * =====================================================
   */

  const safetyScore =
    Math.round(
      overallCompletion *
        0.5 +
        closureRate *
          0.3 +
        trainingRate *
          0.2,
    );

  /*
   * =====================================================
   * ACTION REQUIRED
   * =====================================================
   */

  const actionRows =
    allRows
      .filter(
        (row) =>
          row.status ===
            "not_submitted" ||
          row.status ===
            "case_found",
      )
      .sort(
        (a, b) =>
          Number(b.id) -
          Number(a.id),
      )
      .slice(0, 5);

  /*
   * =====================================================
   * RECENT TRAINING
   * =====================================================
   */

  const recentTraining =
    weeklyRows
      .filter((row) =>
        activityMatches(
          row,
          [
            "training",
            "safety_training",
          ],
        ),
      )
      .sort(
        (a, b) =>
          Number(b.id) -
          Number(a.id),
      )
      .slice(0, 6);

  return (
    <>
      <style>{`
        @keyframes safetyOverviewFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes safetyOverviewScaleIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes safetyBarGrow {
          from { transform: scaleY(0); transform-origin: bottom; opacity: 0.2; }
          to { transform: scaleY(1); transform-origin: bottom; opacity: 1; }
        }

        @keyframes safetyHorizontalGrow {
          from { transform: scaleX(0); transform-origin: left; opacity: 0.2; }
          to { transform: scaleX(1); transform-origin: left; opacity: 1; }
        }

        @keyframes safetyDonutReveal {
          from { opacity: 0; transform: rotate(-8deg) scale(0.94); }
          to { opacity: 1; transform: rotate(0deg) scale(1); }
        }

        @keyframes safetyLineDraw {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes safetyPointReveal {
          from { opacity: 0; transform: scale(0.4); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes safetyTextReveal {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .safety-scroll-animate {
          opacity: 0;
          transform: translateY(18px) scale(0.985);
          will-change: opacity, transform;
        }

        .safety-scroll-animate.is-visible {
          animation: safetyOverviewFadeUp 0.65s ease-out both;
        }

        .safety-scroll-animate.is-visible .safety-animate-card {
          animation: safetyOverviewScaleIn 0.5s ease-out both;
        }

        .safety-scroll-animate.is-visible .safety-animate-card:nth-child(1) { animation-delay: 0.04s; }
        .safety-scroll-animate.is-visible .safety-animate-card:nth-child(2) { animation-delay: 0.10s; }
        .safety-scroll-animate.is-visible .safety-animate-card:nth-child(3) { animation-delay: 0.16s; }
        .safety-scroll-animate.is-visible .safety-animate-card:nth-child(4) { animation-delay: 0.22s; }
        .safety-scroll-animate.is-visible .safety-animate-card:nth-child(5) { animation-delay: 0.28s; }
        .safety-scroll-animate.is-visible .safety-animate-card:nth-child(6) { animation-delay: 0.34s; }

        .safety-bar-grow,
        .safety-horizontal-grow,
        .safety-donut-segment,
        .safety-line-draw,
        .safety-line-point,
        .safety-line-value,
        .safety-line-label {
          animation-play-state: paused !important;
        }

        .safety-scroll-animate.is-visible .safety-bar-grow,
        .safety-scroll-animate.is-visible .safety-horizontal-grow,
        .safety-scroll-animate.is-visible .safety-donut-segment,
        .safety-scroll-animate.is-visible .safety-line-draw,
        .safety-scroll-animate.is-visible .safety-line-point,
        .safety-scroll-animate.is-visible .safety-line-value,
        .safety-scroll-animate.is-visible .safety-line-label {
          animation-play-state: running !important;
        }

        .safety-line-draw {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: safetyLineDraw 1.8s ease-in-out both;
        }

        .safety-line-point {
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          animation: safetyPointReveal 0.35s ease-out both;
        }

        .safety-line-value,
        .safety-line-label {
          opacity: 0;
          animation: safetyTextReveal 0.3s ease-out both;
        }

        .safety-bar-grow {
          animation: safetyBarGrow 0.8s cubic-bezier(0.42, 0, 0.58, 1) both;
        }

        .safety-horizontal-grow {
          animation: safetyHorizontalGrow 1s cubic-bezier(0.42, 0, 0.58, 1) both;
        }

        .safety-donut-segment {
          animation: safetyDonutReveal 0.8s cubic-bezier(0.42, 0, 0.58, 1) both;
          transform-box: fill-box;
          transform-origin: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .safety-overview-page .safety-scroll-animate,
          .safety-overview-page .safety-animate-card,
          .safety-overview-page .safety-bar-grow,
          .safety-overview-page .safety-horizontal-grow,
          .safety-overview-page .safety-donut-segment,
          .safety-overview-page .safety-line-draw,
          .safety-overview-page .safety-line-point,
          .safety-overview-page .safety-line-value,
          .safety-overview-page .safety-line-label {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>

      <div className="safety-overview-page space-y-5">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="safety-scroll-animate flex flex-col gap-3 md:flex-row md:items-end md:justify-between">

        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" />

            <span className="text-[10px] uppercase tracking-[0.16em] text-text-dim">
              {safetyText("management", safetyLanguage)}
            </span>
          </div>

          <h1 className="mt-1 text-xl font-semibold text-text">
            {safetyText("overview", safetyLanguage)}
          </h1>

          <p className="mt-1 text-sm text-text-muted">
            {safetyText("overviewDescription", safetyLanguage)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (selectedMonth === 1) {
                  setSelectedYear((year) => year - 1);
                  setSelectedMonth(12);
                } else {
                  setSelectedMonth((month) => month - 1);
                }
              }}
              className="rounded-md border border-border bg-surface px-2 py-2 text-xs text-text-muted transition hover:bg-surface-hover"
              aria-label={
                safetyLanguage === "cn"
                  ? "上个月"
                  : "Previous month"
              }
            >
              ‹
            </button>

            <div className="min-w-[120px] rounded-md border border-border bg-surface px-3 py-2 text-center text-xs font-medium text-text">
              {monthLabel}
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedMonth === 12) {
                  setSelectedYear((year) => year + 1);
                  setSelectedMonth(1);
                } else {
                  setSelectedMonth((month) => month + 1);
                }
              }}
              className="rounded-md border border-border bg-surface px-2 py-2 text-xs text-text-muted transition hover:bg-surface-hover"
              aria-label={
                safetyLanguage === "cn"
                  ? "下个月"
                  : "Next month"
              }
            >
              ›
            </button>
          </div>

          <Link
            href="/safety/management"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text transition hover:border-accent/50 hover:bg-surface-hover"
          >
            🛡️ {safetyText("management", safetyLanguage)} →
          </Link>

          <div
            className={[
              "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
              overallCompletion >=
                90
                ? "border border-success/30 bg-success/10 text-success"
                : overallCompletion >=
                  70
                ? "border border-warning/30 bg-warning/10 text-warning"
                : "border border-danger/30 bg-danger/10 text-danger",
            ].join(" ")}
          >
            <span
              className={[
                "size-2 rounded-full",
                overallCompletion >=
                  90
                  ? "bg-success"
                  : overallCompletion >=
                    70
                  ? "bg-warning"
                  : "bg-danger",
              ].join(" ")}
            />

            {overallCompletion >=
            90
              ? safetyText("onTrack", safetyLanguage)
              : overallCompletion >=
                70
              ? safetyText("needsAttention", safetyLanguage)
              : safetyText("atRisk", safetyLanguage)}
          </div>
        </div>
      </div>

      {/* =====================================================
          KPI
      ====================================================== */}

      <div className="safety-scroll-animate grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">

        <div className="safety-animate-card rounded-xl border border-border bg-surface p-4"
          >
            <KpiTop
              title={safetyText("safetyTraining", safetyLanguage)}
              icon="🎓"
              tone="accent"
            />

          <div className="mt-3 flex items-center justify-between">
            <p className="text-2xl font-semibold text-text">
              {
                trainingCompleted
              }{" "}
              /{" "}
              {
                trainingTarget
              }
            </p>

            <span className="text-sm text-text-dim group-hover:text-accent">
            </span>
          </div>

          <p className="mt-1 text-[11px] text-text-muted">
            {safetyText("trainingCompleted", safetyLanguage)}
          </p>
        </div>

        <KpiCard
          title={safetyText("hazardFinding", safetyLanguage)}
          value={`${hazardFinding} / 4`}
          subtitle={safetyText("thisMonth", safetyLanguage)}
          icon="⚠️"
          tone="warning"
        />

        <KpiCard
          title={safetyText("cleaningFinding", safetyLanguage)}
          value={`${cleaningFinding} / 4`}
          subtitle={safetyText("thisMonth", safetyLanguage)}
          icon="🧹"
          tone="success"
        />

        <KpiCard
          title={safetyText("totalFindings", safetyLanguage)}
          value={`${totalFinding}`}
          subtitle={safetyText("currentMonth", safetyLanguage)}
          icon="🔎"
          tone="accent"
        />

        <KpiCard
          title={safetyText("safetyMeeting", safetyLanguage)}
          value={`${
            monthlyActivityData.find(
              (item) =>
                item.id ===
                "monthly-meeting",
            )?.completed ?? 0
          } / 1`}
          subtitle={safetyText("monthly", safetyLanguage)}
          icon="📅"
          tone="accent"
        />

        <KpiCard
          title={safetyText("completionRate", safetyLanguage)}
          value={`${overallCompletion}%`}
          subtitle={safetyText("overall", safetyLanguage)}
          icon="📊"
          tone={
            overallCompletion >=
            90
              ? "success"
              : "warning"
          }
        />
      </div>

      {/* =====================================================
          MAIN CHARTS
      ====================================================== */}

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">

        {/* SAFETY COMPLETION TREND */}

        <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">

          <SectionHeader
            title={safetyText("safetyCompletionTrend", safetyLanguage)}
            description={safetyText("weeklyCompletionPerformance", safetyLanguage)}
          />

          <div className="mt-5">
            <LineChart
              data={weeklyTrend.map(
                (item) => ({
                  label: item.label,
                  value: item.rate,
                }),
              )}
              animationDuration={1800}
              animationEasing="ease-in-out"
            />
          </div>
        </section>

        {/* FINDING STATUS */}

        <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">

          <SectionHeader
            title={safetyText("findingStatus", safetyLanguage)}
            description={safetyText("currentSafetyCaseStatus", safetyLanguage)}
          />

          <div className="mt-5 flex items-center justify-center">
            <DonutChart
              language={safetyLanguage}
              values={[
                {
                  label:
                    "Closed",
                  value:
                    closed,
                  className:
                    "stroke-success",
                },
                {
                  label:
                    "In Progress",
                  value:
                    inProgress,
                  className:
                    "stroke-warning",
                },
                {
                  label:
                    "Open",
                  value:
                    open,
                  className:
                    "stroke-danger",
                },
              ]}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <LegendStat
              label={safetyText("closed", safetyLanguage)}
              value={closed}
              tone="success"
            />

            <LegendStat
              label={safetyText("progress", safetyLanguage)}
              value={
                inProgress
              }
              tone="warning"
            />

            <LegendStat
              label={safetyText("open", safetyLanguage)}
              value={open}
              tone="danger"
            />
          </div>

          <div className="mt-5 rounded-lg border border-border-subtle bg-bg/30 p-4 text-center">
            <p className="text-[10px] uppercase tracking-wide text-text-dim">
              {safetyText("closureRate", safetyLanguage)}
            </p>

            <p className="mt-1 text-3xl font-semibold text-success">
              {closureRate}%
            </p>
          </div>
        </section>
      </div>

      {/* =====================================================
          FINDING TREND + REQUIREMENT TREND
      ====================================================== */}

      <div className="grid gap-5 xl:grid-cols-2">

        {/* FINDING TREND */}

        <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">

          <SectionHeader
            title={safetyText("weeklyFindingTrend", safetyLanguage)}
            description={safetyText("hazardAndCleaningFindings", safetyLanguage)}
          />

          <div className="mt-5">
            <GroupedBarChart
              data={weeklyTrend.map(
                (item) => ({
                  label:
                    item.label,
                  first:
                    item.hazard,
                  second:
                    item.cleaning,
                }),
              )}
              firstLabel={safetyText("hazard", safetyLanguage)}
              secondLabel={safetyText("cleaning", safetyLanguage)}
            />
          </div>
        </section>

        {/* REQUIREMENT TREND */}

        <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">

          <SectionHeader
            title={safetyText("weeklyRequirementCompletion", safetyLanguage)}
            description={safetyText("completedRequirementsByWeek", safetyLanguage)}
          />

          <div className="mt-5">
            <HorizontalBarChart
              data={weeklyTrend.map(
                (item) => ({
                  label:
                    item.label,
                  value:
                    item.rate,
                }),
              )}
              suffix="%"
            />
          </div>
        </section>
      </div>

      {/* =====================================================
          TRAINING + MONTHLY ACTIVITY
      ====================================================== */}

      <div className="grid gap-5 xl:grid-cols-2">

        {/* TRAINING PERFORMANCE */}

        <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">

          <SectionHeader
            title={safetyText("safetyTrainingPerformance", safetyLanguage)}
            description={safetyText("trainingCompletionByWeek", safetyLanguage)}
          />

          <div className="mt-5">
            <LineChart
              data={trainingWeekly.map(
                (item) => ({
                  label: item.label,
                  value: item.rate,
                }),
              )}
              max={100}
              animationDuration={1800}
              animationEasing="ease-in-out"
            />
          </div>

          <div className="mt-5 flex items-center justify-between rounded-lg border border-border-subtle bg-bg/30 p-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-dim">
                {safetyText("trainingCompletion", safetyLanguage)}
              </p>

              <p className="mt-1 text-2xl font-semibold text-text">
                {
                  trainingCompleted
                }{" "}
                /{" "}
                {
                  trainingTarget
                }
              </p>
            </div>

            <span className="text-2xl font-semibold text-accent">
              {trainingRate}%
            </span>
          </div>
        </section>

        {/* MONTHLY ACTIVITY */}

        <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">

          <SectionHeader
            title={safetyText("monthlySafetyActivity", safetyLanguage)}
            description={safetyText("monthlyRequirementCompletion", safetyLanguage)}
          />

          <div className="mt-5 space-y-4">
            {monthlyActivityData.map(
              (item) => (
                <div
                  key={item.id}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {
                          item.icon
                        }
                      </span>

                      <span className="text-xs font-medium text-text">
                        {getActivityTitle(item.id, safetyLanguage)}
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-text">
                      {
                        item.completed
                      }{" "}
                      /{" "}
                      {
                        item.target
                      }
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-bg">
                    <div
                      className={[
                        "h-full rounded-full transition-all",
                        item.rate >=
                          100
                          ? "bg-success"
                          : item.rate >=
                            50
                          ? "bg-warning"
                          : "bg-danger",
                      ].join(" ")}
                      style={{
                        width: `${Math.min(
                          item.rate,
                          100,
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-1 text-right text-[9px] text-text-dim">
                    {
                      item.rate
                    }%
                  </p>
                </div>
              ),
            )}
          </div>
        </section>
      </div>

      {/* =====================================================
          SAFETY PERFORMANCE SCORE
      ====================================================== */}

      <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">

        <SectionHeader
          title={safetyText("safetyPerformanceScore", safetyLanguage)}
          description={safetyText("overallMonthlySafetyPerformance", safetyLanguage)}
        />

        <div className="mt-5 grid gap-4 md:grid-cols-4">

          <ScoreCard
            title={safetyText("overallCompletion", safetyLanguage)}
            value={
              overallCompletion
            }
            icon="📋"
          />

          <ScoreCard
            title={safetyText("findingClosure", safetyLanguage)}
            value={
              closureRate
            }
            icon="🔒"
          />

          <ScoreCard
            title={safetyText("training", safetyLanguage)}
            value={
              trainingRate
            }
            icon="🎓"
          />

          <ScoreCard
            title={safetyText("safetyScore", safetyLanguage)}
            value={
              safetyScore
            }
            icon="🏆"
            highlight
          />
        </div>
      </section>

      {/* =====================================================
          WEEKLY REQUIREMENT
      ====================================================== */}

      <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">

        <SectionHeader
          title={safetyText("weeklySafetyRequirement", safetyLanguage)}
          description={safetyText("currentWeeklySafetyActivities", safetyLanguage)}
        />

        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">

          {WEEKLY_ACTIVITY_NAMES.map(
            (activity) => {
              const total =
                weeklyRows.filter(
                  (row) =>
                    activityMatches(
                      row,
                      activity.names,
                    ),
                ).length;

              const completed =
                weeklyRows.filter(
                  (row) =>
                    activityMatches(
                      row,
                      activity.names,
                    ) &&
                    isCompleted(row),
                ).length;

              const percentage =
                total > 0
                  ? 100
                  : 0;

              return (
                <div
                  key={activity.id}
                  className="rounded-lg border border-border-subtle bg-bg/30 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg">
                      {
                        activity.icon
                      }
                    </span>

                    <span
                      className={
                        completed >
                        0
                          ? "text-success"
                          : "text-danger"
                      }
                    >
                      {completed >
                      0
                        ? "✓"
                        : "!"}
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-medium text-text">
                    {getActivityTitle(activity.id, safetyLanguage)}
                  </p>

                  <p className="mt-1 text-[10px] text-text-muted">
                    {completed}
                    {" / "}
                    {Math.max(
                      total,
                      1,
                    )}
                  </p>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
                    <div
                      className={
                        completed >
                        0
                          ? "h-full rounded-full bg-success"
                          : "h-full rounded-full bg-danger"
                      }
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            },
          )}
        </div>

        <div className="mt-5 rounded-lg border border-border-subtle bg-bg/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-dim">
                {safetyText("weeklyCompletion", safetyLanguage)}
              </p>

              <p className="mt-1 text-2xl font-semibold text-text">
                {
                  weeklyCompleted
                }{" "}
                /{" "}
                {
                  weeklyTarget
                }
              </p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-semibold text-accent">
                {
                  weeklyCompletion
                }%
              </p>

              <p className="text-[10px] text-text-muted">
                {safetyText("currentMonth", safetyLanguage)}
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-accent"
              style={{
                width: `${weeklyCompletion}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          TRAINING TABLE
      ====================================================== */}

      <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">

        <SectionHeader
          title={safetyText("safetyTraining", safetyLanguage)}
          description={safetyText("trainingCompletionByWeek", safetyLanguage)}
        />

        <div className="mt-4 overflow-x-auto">

          <table className="w-full min-w-[650px] border-collapse">

            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                  {safetyText("week", safetyLanguage)}
                </th>

                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                  {safetyText("date", safetyLanguage)}
                </th>

                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                  {safetyText("pic", safetyLanguage)}
                </th>

                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                  {safetyText("location", safetyLanguage)}
                </th>

                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                  {safetyText("status", safetyLanguage)}
                </th>
              </tr>
            </thead>

            <tbody>
              {recentTraining.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-xs text-text-muted"
                  >
                    {safetyText("noTrainingData", safetyLanguage)}
                  </td>
                </tr>
              ) : (
                recentTraining.map(
                  (row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border-subtle last:border-b-0"
                    >
                      <td className="px-3 py-3 text-xs font-medium text-text">
                        W
                        {row.week ??
                          "—"}
                      </td>

                      <td className="px-3 py-3 text-xs text-text-muted">
                        {formatDate(
                          row.submission_date,
                        )}
                      </td>

                      <td className="px-3 py-3 text-xs text-text">
                        {row.pic ??
                          pic}
                      </td>

                      <td className="px-3 py-3 text-xs text-text-muted">
                        {row.location ??
                          location}
                      </td>

                      <td className="px-3 py-3">
                        <StatusBadge
                          status={
                            row.status
                          }
                          language={safetyLanguage}
                        />
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {safetyText("trainingAttendance", safetyLanguage)}
            </span>

            <span className="text-xs font-semibold text-text">
              {trainingRate}%
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-accent"
              style={{
                width: `${trainingRate}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          ACTION REQUIRED
      ====================================================== */}

      <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">

        <SectionHeader
          title={safetyText("actionRequired", safetyLanguage)}
          description={safetyText("activitiesNeedAttention", safetyLanguage)}
        />

        <div className="mt-4 space-y-2">

          {actionRows.length ===
          0 ? (
            <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-center">
              <p className="text-sm font-medium text-success">
                {safetyText("noActionRequired", safetyLanguage)}
              </p>

              <p className="mt-1 text-xs text-text-muted">
                {safetyText("allActivitiesOnTrack", safetyLanguage)}
              </p>
            </div>
          ) : (
            actionRows.map(
              (row) => {
                const danger =
                  row.status ===
                  "case_found";

                return (
                  <div
                    key={row.id}
                    className="grid gap-3 rounded-lg border border-border-subtle bg-bg/20 p-3 md:grid-cols-[4px_1fr_auto]"
                  >
                    <div
                      className={[
                        "hidden rounded-full md:block",
                        danger
                          ? "bg-danger"
                          : "bg-warning",
                      ].join(" ")}
                    />

                    <div>
                      <p className="text-sm font-medium text-text">
                        {
                          getActivityTitle(
                            row.activity_type,
                            safetyLanguage,
                          )
                        }
                      </p>

                      <p className="mt-1 text-xs text-text-muted">
                        {row.description ??
                          (danger
                            ? safetyText("safetyCaseNeedsAttention", safetyLanguage)
                            : safetyText("activityNotSubmitted", safetyLanguage))}
                      </p>

                      <p className="mt-1 text-[11px] text-text-dim">
                        {safetyText("pic", safetyLanguage)}:{" "}
                        {row.pic ??
                          pic}
                      </p>

                      <p className="text-[11px] text-text-dim">
                        {safetyText("location", safetyLanguage)}:{" "}
                        {row.location ??
                          location}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-[10px] uppercase tracking-wide text-text-dim">
                        {safetyText("status", safetyLanguage)}
                      </p>

                      <StatusBadge
                        status={
                          row.status
                        }
                        language={safetyLanguage}
                      />
                    </div>
                  </div>
                );
              },
            )
          )}
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <div className="pb-2 text-center text-[10px] text-text-dim">
        {safetyText("itSafetyManagementSystem", safetyLanguage)}
        {" • 2026"}
      </div>
      </div>
    </>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function KpiTop({
  title,
  icon,
  tone,
}: {
  title: string;
  icon: string;
  tone:
    | "accent"
    | "success"
    | "warning";
}) {
  const classes = {
    accent:
      "bg-accent/10",
    success:
      "bg-success/10",
    warning:
      "bg-warning/10",
  };

  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-[10px] uppercase tracking-wide text-text-dim">
        {title}
      </p>

      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-md text-sm ${classes[tone]}`}
      >
        {icon}
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  tone:
    | "accent"
    | "success"
    | "warning"
    | "danger";
}) {
  const iconClass = {
    accent:
      "bg-accent/10",
    success:
      "bg-success/10",
    warning:
      "bg-warning/10",
    danger:
      "bg-danger/10",
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] uppercase tracking-wide text-text-dim">
          {title}
        </p>

        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-md text-sm ${iconClass[tone]}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-semibold text-text">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-text-muted">
        {subtitle}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text">
        {title}
      </h2>

      <p className="mt-1 text-xs text-text-muted">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   LINE CHART
========================================================= */

function LineChart({
  data,
  max = 100,
  animationDuration = 1800,
  animationEasing = "ease-in-out",
}: {
  data: {
    label: string;
    value: number;
  }[];
  max?: number;
  animationDuration?: number;
  animationEasing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}) {
  const width = 700;
  const height = 260;

  const left = 42;
  const right = 20;
  const top = 25;
  const bottom = 35;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const points = data.map((item, index) => {
    const x =
      left +
      (index / Math.max(data.length - 1, 1)) * chartWidth;

    const y =
      top +
      chartHeight -
      (item.value / max) * chartHeight;

    return {
      x,
      y,
      ...item,
    };
  });

  const path =
    points.length > 0
      ? points
          .map(
            (point, index) =>
              `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
          )
          .join(" ")
      : "";

  const easingKeySplines =
    animationEasing === "linear"
      ? "0 0 1 1"
      : animationEasing === "ease-in"
        ? "0.42 0 1 1"
        : animationEasing === "ease-out"
          ? "0 0 0.58 1"
          : "0.42 0 0.58 1";

  const durationSeconds = animationDuration / 1000;
  const pointIntervalSeconds =
    data.length > 1
      ? Math.max(durationSeconds / (data.length - 1), 0.12)
      : durationSeconds;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
      >
        {[0, 25, 50, 75, 100].map((value) => {
          const y =
            top +
            chartHeight -
            (value / 100) * chartHeight;

          return (
            <g key={value}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                className="stroke-border-subtle"
                strokeWidth="1"
              />

              <text
                x="5"
                y={y + 3}
                className="fill-text-dim text-[9px]"
              >
                {value}%
              </text>
            </g>
          );
        })}

        {path && (
          <path
            d={path}
            fill="none"
            pathLength="1"
            className="stroke-accent safety-line-draw"
            style={{ animationDuration: `${durationSeconds}s` }}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1"
            strokeDashoffset="1"
          >
          </path>
        )}

        {points.map((point, index) => {
          const delay = `${index * pointIntervalSeconds}s`;

          return (
            <g key={point.label}>
              {/* Titik muncul mengikuti perjalanan garis */}
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                className="fill-surface stroke-accent safety-line-point"
                strokeWidth="3"
                style={{ animationDelay: delay }}
              />

              <text
                x={point.x}
                y={point.y - 12}
                textAnchor="middle"
                className="fill-text-muted text-[9px] safety-line-value"
                style={{
                  animationDelay: `${index * pointIntervalSeconds + 0.15}s`,
                }}
              >
                {point.value}%
              </text>

              <text
                x={point.x}
                y={height - 10}
                textAnchor="middle"
                className="fill-text-dim text-[9px] safety-line-label"
                style={{
                  animationDelay: `${Math.max(index * pointIntervalSeconds - 0.1, 0)}s`,
                }}
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* =========================================================
   GROUPED BAR
========================================================= */

function GroupedBarChart({
  data,
  firstLabel,
  secondLabel,
}: {
  data: {
    label: string;
    first: number;
    second: number;
  }[];
  firstLabel: string;
  secondLabel: string;
}) {
  const max = Math.max(
    ...data.flatMap(
      (item) => [
        item.first,
        item.second,
      ],
    ),
    1,
  );

  return (
    <div>
      <div className="flex h-56 items-end gap-4 border-b border-border-subtle px-2 pb-8">
        {data.map(
          (item, index) => (
            <div
              key={item.label}
              className="relative flex h-full flex-1 items-end justify-center gap-1"
            >
              <div className="relative flex h-full items-end">
                <div
                  className="w-7 rounded-t bg-warning safety-bar-grow"
                  style={{
                    animationDelay: `${index * 0.14}s`,
                    height: `${
                      Math.max(
                        (item.first /
                          max) *
                          100,
                        item.first >
                          0
                          ? 5
                          : 0,
                      )
                    }%`,
                  }}
                />

                {item.first >
                  0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-text-muted">
                    {
                      item.first
                    }
                  </span>
                )}
              </div>

              <div className="relative flex h-full items-end">
                <div
                  className="w-7 rounded-t bg-success safety-bar-grow"
                  style={{
                    animationDelay: `${index * 0.14 + 0.06}s`,
                    height: `${
                      Math.max(
                        (item.second /
                          max) *
                          100,
                        item.second >
                          0
                          ? 5
                          : 0,
                      )
                    }%`,
                  }}
                />

                {item.second >
                  0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-text-muted">
                    {
                      item.second
                    }
                  </span>
                )}
              </div>

              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-text-dim">
                {item.label}
              </span>
            </div>
          ),
        )}
      </div>

      <div className="mt-6 flex items-center gap-5">
        <Legend
          color="bg-warning"
          label={firstLabel}
        />

        <Legend
          color="bg-success"
          label={secondLabel}
        />
      </div>
    </div>
  );
}

/* =========================================================
   HORIZONTAL BAR
========================================================= */

function HorizontalBarChart({
  data,
  suffix = "",
}: {
  data: {
    label: string;
    value: number;
  }[];
  suffix?: string;
}) {
  return (
    <div className="space-y-5">
      {data.map(
        (item, index) => (
          <div
            key={item.label}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-text">
                {item.label}
              </span>

              <span className="text-xs font-semibold text-text">
                {
                  item.value
                }
                {suffix}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-bg">
              <div
                className={[
                  "h-full rounded-full safety-horizontal-grow",
                  item.value >=
                    90
                    ? "bg-success"
                    : item.value >=
                      70
                    ? "bg-warning"
                    : "bg-danger",
                ].join(" ")}
                style={{
                  animationDelay: `${index * 0.12}s`,
                  width: `${Math.min(
                    item.value,
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

/* =========================================================
   DONUT
========================================================= */

function DonutChart({
  values,
  language,
}: {
  values: {
    label: string;
    value: number;
    className: string;
  }[];
  language: SafetyLanguage;
}) {
  const total =
    values.reduce(
      (sum, item) =>
        sum + item.value,
      0,
    );

  const radius = 55;

  const circumference =
    2 *
    Math.PI *
    radius;

  let accumulated = 0;

  return (
    <div className="relative size-48">
      <svg
        viewBox="0 0 140 140"
        className="size-full -rotate-90"
      >
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          className="stroke-bg"
          strokeWidth="16"
        />

        {values.map(
          (item, index) => {
            const percentage =
              total > 0
                ? item.value /
                  total
                : 0;

            const dash =
              percentage *
              circumference;

            const gap = 3;

            const offset =
              -accumulated *
              circumference;

            accumulated +=
              percentage;

            return (
              <circle
                key={
                  item.label
                }
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                className={`${item.className} safety-donut-segment`}
                style={{
                  animationDelay: `${index * 0.14}s`,
                }}
                strokeWidth="16"
                strokeDasharray={`${Math.max(
                  dash -
                    gap,
                  0,
                )} ${circumference}`}
                strokeDashoffset={
                  offset
                }
                strokeLinecap="butt"
              />
            );
          },
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-text">
          {total}
        </span>

        <span className="text-[10px] text-text-dim">
          {safetyText("total", language)}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   SCORE CARD
========================================================= */

function ScoreCard({
  title,
  value,
  icon,
  highlight = false,
}: {
  title: string;
  value: number;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-4",
        highlight
          ? "border-accent/30 bg-accent/5"
          : "border-border-subtle bg-bg/30",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg">
          {icon}
        </span>

        <span
          className={[
            "text-2xl font-semibold",
            value >= 90
              ? "text-success"
              : value >=
                70
              ? "text-warning"
              : "text-danger",
          ].join(" ")}
        >
          {value}
        </span>
      </div>

      <p className="mt-3 text-[10px] uppercase tracking-wide text-text-dim">
        {title}
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
        <div
          className={[
            "h-full rounded-full",
            value >= 90
              ? "bg-success"
              : value >= 70
              ? "bg-warning"
              : "bg-danger",
          ].join(" ")}
          style={{
            width: `${Math.min(
              value,
              100,
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   LEGEND
========================================================= */

function Legend({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`size-2 rounded-full ${color}`}
      />

      <span className="text-[11px] text-text-muted">
        {label}
      </span>
    </div>
  );
}

/* =========================================================
   LEGEND STAT
========================================================= */

function LegendStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    | "success"
    | "warning"
    | "danger";
}) {
  const classes = {
    success:
      "bg-success/10 text-success",
    warning:
      "bg-warning/10 text-warning",
    danger:
      "bg-danger/10 text-danger",
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-bg/30 p-3 text-center">
      <p
        className={`text-lg font-semibold ${classes[tone].split(" ")[1]}`}
      >
        {value}
      </p>

      <p className="mt-1 text-[9px] text-text-dim">
        {label}
      </p>
    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
  language,
}: {
  status?: string;
  language: SafetyLanguage;
}) {
  const normalized =
    status ??
    "not_submitted";

  const config =
    normalized ===
    "completed"
      ? {
          label:
            safetyText("closed", language),
          className:
            "bg-success/10 text-success",
        }
      : normalized ===
        "case_found"
      ? {
          label:
            language === "cn" ? "发现案件" : "Case Found",
          className:
            "bg-danger/10 text-danger",
        }
      : normalized ===
        "not_applicable"
      ? {
          label:
            language === "cn" ? "无案件" : "No Case",
          className:
            "bg-accent/10 text-accent",
        }
      : {
          label:
            language === "cn" ? "未提交" : "Not Submitted",
          className:
            "bg-warning/10 text-warning",
        };

  return (
    <span
      className={`mt-1 inline-flex rounded-md px-2 py-1 text-[9px] font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

/* =========================================================
   ACTIVITY TITLE
========================================================= */

function getActivityTitle(
  activity?: string,
  language: SafetyLanguage = "en",
) {
  const normalized =
    normalizeActivity(
      activity,
    );

  const all = [
    ...WEEKLY_ACTIVITY_NAMES,
    ...MONTHLY_ACTIVITY_NAMES,
  ];

  const found =
    all.find((item) =>
      item.names.some(
        (name) =>
          normalizeActivity(
            name,
          ) === normalized,
      ),
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

/* =========================================================
   DATE
========================================================= */

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(
    `${value.slice(
      0,
      10,
    )}T00:00:00`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}
