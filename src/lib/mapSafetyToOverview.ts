import type { ModuleCardData } from "@/data/overview-mock";

export type SafetyStatus =
  | "completed"
  | "not_submitted"
  | "not_applicable"
  | "case_found"
  | string;

export type SafetyRow = {
  id: number;
  year?: number;
  month?: number;
  week?: number | null;
  activity_type?: string | null;
  status?: SafetyStatus | null;
  submission_date?: string | null;
  pic?: string | null;
  pic_en?: string | null;
  pic_cn?: string | null;
};

export type SafetyLanguage = "en" | "cn";

type WeeklyTrendItem = {
  label: string;
  value: number;
  completed: number;
  total: number;
};

type MonthlyItem = {
  label: string;
  completed: number;
  target: number;
  status: "completed" | "pending" | "case_found";
};

type SafetyMetrics = {
  weeklyTrend: WeeklyTrendItem[];
  weeklyCompletion: number;
  monthlyCompletion: number;
  overallCompletion: number;
  closureRate: number;
  trainingRate: number;
  safetyScore: number;
};

/*
 * ============================================================
 * SAFETY ACTIVITIES
 * ============================================================
 *
 * Ini adalah data Safety sendiri.
 * Tidak mengambil activity dari overview-mock.ts.
 */

const WEEKLY_ACTIVITIES = [
  [
    "training",
    "safety_training",
    "safety-training",
    "safety training",
  ],

  [
    "hse",
    "hse_tuesday",
    "hse-tuesday",
    "hse tuesday",
  ],

  [
    "ert",
    "ert_report",
    "ert-report",
    "ert report",
  ],

  [
    "five_s",
    "five-s",
    "5s",
    "cleaning",
    "cleaning_finding",
    "cleaning-finding",
  ],

  [
    "potential_hazard",
    "potential-hazard",
    "potential hazard",
    "hazard",
    "hazard_finding",
    "hazard-finding",
  ],

  [
    "bbs",
    "routine_meeting",
    "routine-meeting",
    "routine meeting",
    "routine",
  ],
] as const;

const MONTHLY_ACTIVITIES = [
  [
    "fire_drill",
    "fire-drill",
    "fire drill",
  ],

  [
    "monthly_meeting",
    "monthly-meeting",
    "monthly meeting",
  ],

  [
    "safety_case",
    "hazard_case",
    "hazard-case",
    "safety case",
  ],

  [
    "monthly_ppt",
    "safety_ppt",
    "safety-ppt",
    "safety ppt",
  ],

  [
    "reward_finding",
    "reward-finding",
    "reward finding",
  ],
] as const;

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function normalizeActivity(
  value?: string | null,
) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
}

function activityMatches(
  row: SafetyRow,
  aliases: readonly string[],
) {
  const activity = normalizeActivity(
    row.activity_type,
  );

  return aliases.some(
    (alias) =>
      normalizeActivity(alias) === activity,
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

/*
 * ============================================================
 * WEEKLY
 * ============================================================
 */

function calculateWeeklyTrend(
  weeklyRows: SafetyRow[],
): WeeklyTrendItem[] {
  const weeks = [1, 2, 3, 4];

  return weeks.map((week) => {
    const rows = weeklyRows.filter(
      (row) =>
        Number(row.week) === week,
    );

    const completed =
      WEEKLY_ACTIVITIES.filter(
        (activity) =>
          rows.some(
            (row) =>
              activityMatches(
                row,
                activity,
              ) &&
              isCompleted(row),
          ),
      ).length;

    const total =
      WEEKLY_ACTIVITIES.length;

    return {
      label: `W${week}`,

      value:
        total > 0
          ? Math.round(
              (completed / total) * 100,
            )
          : 0,

      completed,
      total,
    };
  });
}

/*
 * ============================================================
 * MONTHLY
 * ============================================================
 */

function calculateMonthlyItems(
  monthlyRows: SafetyRow[],
  lang: SafetyLanguage,
): MonthlyItem[] {
  const labels =
    lang === "cn"
      ? [
          "消防演练",
          "月度会议",
          "安全案例",
          "安全PPT",
          "奖励发现",
        ]
      : [
          "Fire Drill",
          "Monthly Meeting",
          "Safety Case",
          "Safety PPT",
          "Reward Finding",
        ];

  return MONTHLY_ACTIVITIES.map(
    (activity, index) => {
      const rows =
        monthlyRows.filter(
          (row) =>
            activityMatches(
              row,
              activity,
            ),
        );

      /*
       * Reward Finding mempunyai target 2.
       * Activity lainnya mempunyai target 1.
       */
      const target =
        index === 4 ? 2 : 1;

      /*
       * Safety Case:
       *
       * case_found = ada case
       * completed  = tidak ada case dan requirement selesai
       */
      if (index === 2) {
        const caseFound =
          rows.some(
            (row) =>
              row.status ===
              "case_found",
          );

        const completed =
          !caseFound &&
          rows.some(isCompleted);

        return {
          label: labels[index],

          completed:
            completed ? 1 : 0,

          target,

          status: caseFound
            ? "case_found"
            : completed
              ? "completed"
              : "pending",
        };
      }

      /*
       * Reward Finding
       */
      if (index === 4) {
        const completed = Math.min(
          rows.filter(
            (row) =>
              row.status ===
              "completed",
          ).length,
          target,
        );

        return {
          label: labels[index],
          completed,
          target,
          status:
            completed >= target
              ? "completed"
              : "pending",
        };
      }

      /*
       * Requirement bulanan biasa.
       */
      const completed =
        rows.some(isCompleted)
          ? 1
          : 0;

      return {
        label: labels[index],
        completed,
        target,
        status:
          completed >= target
            ? "completed"
            : "pending",
      };
    },
  );
}

/*
 * ============================================================
 * SAFETY METRICS
 * ============================================================
 */

function calculateSafetyMetrics(
  weeklyRows: SafetyRow[],
  monthlyRows: SafetyRow[],
  lang: SafetyLanguage,
): SafetyMetrics {
  const weeklyTrend =
    calculateWeeklyTrend(
      weeklyRows,
    );

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

  const monthlyItems =
    calculateMonthlyItems(
      monthlyRows,
      lang,
    );

  const monthlyCompleted =
    monthlyItems.reduce(
      (sum, item) =>
        sum + item.completed,
      0,
    );

  const monthlyTarget =
    monthlyItems.reduce(
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
   * Overall Completion
   *
   * Weekly + Monthly
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
   * ==========================================================
   * FINDING CLOSURE
   * ==========================================================
   */

  const allRows = [
    ...weeklyRows,
    ...monthlyRows,
  ];

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

  const caseFound =
    allRows.filter(
      (row) =>
        row.status ===
        "case_found",
    ).length;

  const totalStatus =
    closed +
    open +
    caseFound;

  const closureRate =
    totalStatus > 0
      ? Math.round(
          (closed /
            totalStatus) *
            100,
        )
      : 0;

  /*
   * ==========================================================
   * TRAINING
   * ==========================================================
   *
   * Training dihitung berdasarkan W1-W4.
   */

  const trainingCompleted =
    [1, 2, 3, 4].filter(
      (week) =>
        weeklyRows.some(
          (row) =>
            Number(row.week) ===
              week &&
            activityMatches(
              row,
              WEEKLY_ACTIVITIES[0],
            ) &&
            isCompleted(row),
        ),
    ).length;

  const trainingRate =
    Math.round(
      (trainingCompleted / 4) *
        100,
    );

  /*
   * ==========================================================
   * SAFETY SCORE
   * ==========================================================
   *
   * 50% Overall Completion
   * 30% Finding Closure
   * 20% Training
   */

  const safetyScore =
    Math.round(
      overallCompletion * 0.5 +
        closureRate * 0.3 +
        trainingRate * 0.2,
    );

  return {
    weeklyTrend,
    weeklyCompletion,
    monthlyCompletion,
    overallCompletion,
    closureRate,
    trainingRate,
    safetyScore,
  };
}

/*
 * ============================================================
 * LABELS
 * ============================================================
 */

function getLabels(
  lang: SafetyLanguage,
) {
  if (lang === "cn") {
    return {
      title: "安全管理",

      overall:
        "总体完成率",

      closure:
        "发现项关闭率",

      training:
        "培训完成率",

      score:
        "安全评分",

      weekly:
        "每周安全要求",

      monthly:
        "月度活动",

      performance:
        "安全绩效评分",

      overallWeight:
        "总体完成率 × 50%",

      closureWeight:
        "发现项关闭率 × 30%",

      trainingWeight:
        "培训完成率 × 20%",
    };
  }

  return {
    title:
      "Safety Dashboard",

    overall:
      "Overall Completion",

    closure:
      "Finding Closure",

    training:
      "Training Completion",

    score:
      "Safety Score",

    weekly:
      "Weekly Safety Requirements",

    monthly:
      "Monthly Activities",

    performance:
      "Safety Performance Score",

    overallWeight:
      "Overall Completion × 50%",

    closureWeight:
      "Finding Closure × 30%",

    trainingWeight:
      "Training Completion × 20%",
  };
}

/*
 * ============================================================
 * MAIN MAPPER
 * ============================================================
 *
 * IMPORTANT:
 *
 * Jangan tambahkan:
 *
 *   module: ModuleCardData
 *
 * sebagai parameter pertama.
 *
 * Safety dibuat sebagai ModuleCardData BARU.
 *
 * Jadi pemanggilannya:
 *
 * mapSafetyToOverview(
 *   weeklyRows,
 *   monthlyRows,
 *   lang,
 * )
 *
 * bukan:
 *
 * mapSafetyToOverview(
 *   module,
 *   weeklyRows,
 *   monthlyRows,
 *   lang,
 * )
 */

export function mapSafetyToOverview(
  weeklyRows: SafetyRow[],
  monthlyRows: SafetyRow[],
  lang: SafetyLanguage = "en",
): ModuleCardData {
  const labels =
    getLabels(lang);

  const metrics =
    calculateSafetyMetrics(
      weeklyRows,
      monthlyRows,
      lang,
    );

  const monthlyItems =
    calculateMonthlyItems(
      monthlyRows,
      lang,
    );

  /*
   * ==========================================================
   * KPI
   * ==========================================================
   */

  const stats: ModuleCardData["stats"] =
    [
      {
        label:
          labels.overall,

        value:
          `${metrics.overallCompletion}%`,

        trend:
          `${metrics.weeklyCompletion}%`,

        tone: "accent",
      },

      {
        label:
          labels.closure,

        value:
          `${metrics.closureRate}%`,

        trend:
          `${metrics.closureRate}%`,

        tone:
          metrics.closureRate >= 80
            ? "success"
            : "warning",
      },

      {
        label:
          labels.training,

        value:
          `${metrics.trainingRate}%`,

        trend:
          `${metrics.trainingRate}%`,

        tone:
          metrics.trainingRate >= 80
            ? "success"
            : "warning",
      },

      {
        label:
          labels.score,

        value:
          `${metrics.safetyScore}%`,

        trend:
          `${metrics.safetyScore}%`,

        tone:
          metrics.safetyScore >= 80
            ? "success"
            : "warning",
      },
    ];

  /*
   * ==========================================================
   * WEEKLY
   * ==========================================================
   */

  const trendBars =
    {
      title:
        labels.weekly,

      items:
        metrics.weeklyTrend.map(
          (item) => ({
            label:
              item.label,

            value:
              item.value,

            max: 100,

            color:
              item.value >= 80
                ? "#22c55e"
                : item.value >= 50
                  ? "#f59e0b"
                  : "#ef4444",
          }),
        ),
    };

  /*
   * ==========================================================
   * MONTHLY
   * ==========================================================
   */

  const bars = {
    title:
      labels.monthly,

    items:
      monthlyItems.map(
        (item) => ({
          label:
            item.label,

          value:
            item.completed,

          max:
            item.target,

          color:
            item.status ===
            "completed"
              ? "#22c55e"
              : item.status ===
                  "case_found"
                ? "#ef4444"
                : "#f59e0b",
        }),
      ),
  };

  /*
   * ==========================================================
   * SAFETY SCORE DONUT
   * ==========================================================
   */

  const scoreSegments = [
    Math.round(
      metrics.overallCompletion *
        0.5,
    ),

    Math.round(
      metrics.closureRate *
        0.3,
    ),

    Math.round(
      metrics.trainingRate *
        0.2,
    ),
  ];

  const chart:
    ModuleCardData["chart"] =
    {
      type: "donut",

      title:
        labels.performance,

      centerValue:
        `${metrics.safetyScore}%`,

      centerLabel:
        labels.score,

      segments:
        scoreSegments,

      legend: [
        {
          label:
            labels.overallWeight,

          color:
            "#22c55e",
        },

        {
          label:
            labels.closureWeight,

          color:
            "#3b82f6",
        },

        {
          label:
            labels.trainingWeight,

          color:
            "#f97316",
        },
      ],
    };

  /*
   * ==========================================================
   * FINAL SAFETY MODULE
   * ==========================================================
   *
   * Tidak ada:
   *
   *   ...module
   *
   * Tidak ada:
   *
   *   module.stats
   *   module.chart
   *   module.trendBars
   *   module.pics
   *
   * Jadi mock Safety benar-benar tidak dipakai.
   */

  return {
    id: "safety",

    number: 3,

    title:
      labels.title,

    icon: "shield",

    href: "/safety",

    layout: "safety",

    colSpan: 1,

    accentColor:
      "#ef4444",

    stats,

    trendBars,

    bars,

    pics: undefined,

    chart,
  };
}

export {
  calculateSafetyMetrics,
};