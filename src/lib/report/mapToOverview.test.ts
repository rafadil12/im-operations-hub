import { describe, expect, it } from "vitest";
import { dashboardModules } from "@/data/overview";
import { mapReportToOverview } from "./mapToOverview";
import type { ReportOverviewMetrics } from "./types";

const reportModule = dashboardModules.find((m) => m.id === "report")!;

function sampleMetrics(): ReportOverviewMetrics {
  return {
    year: 2026,
    weekNumber: 35,
    weekLabel: "Week 35",
    weekStartsOn: "2026-08-29",
    weekEndsOn: "2026-09-04",
    achievement: { value: 92.5, previousValue: 92.5, delta: 0 },
    workCompletion: { value: 100, previousValue: 100, delta: 0 },
    projectProgress: { value: 40, previousValue: 40, delta: 0 },
    onTimeRate: { value: 100, previousValue: 100, delta: 0 },
    reportCompletion: { value: 100, previousValue: 100, delta: 0 },
    reportLineCount: { value: 8, previousValue: 8, delta: 0 },
    currentWeekStatus: "on_target",
    totalLines: 8,
    totalWeeks: 12,
    avgCompletionRate: 92.5,
    submittedCount: 4,
    draftCount: 0,
    byArea: [
      {
        areaId: 1,
        code: "MES",
        nameEn: "MOM",
        nameCn: "MOM",
        lineCount: 2,
        avgCompletionRate: 100,
        submittedWeeks: 1,
      },
      {
        areaId: 2,
        code: "IT",
        nameEn: "IT",
        nameCn: "IT",
        lineCount: 2,
        avgCompletionRate: 70,
        submittedWeeks: 1,
      },
    ],
    weeklyTrend: [
      {
        label: "W34",
        year: 2026,
        weekNumber: 34,
        avgRate: 92.5,
        workCompletionRate: 100,
        projectProgressRate: 40,
        lineCount: 8,
      },
      {
        label: "W35",
        year: 2026,
        weekNumber: 35,
        avgRate: 92.5,
        workCompletionRate: 100,
        projectProgressRate: 40,
        lineCount: 8,
      },
    ],
    divisions: [],
    dailyWork: {
      planned: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      completionRate: 100,
    },
    projects: {
      activeCount: 1,
      onTrack: 0,
      atRisk: 0,
      delayed: 0,
      overallProgress: 40,
      items: [],
    },
    safety: {
      lineCount: 0,
      avgCompletionRate: 0,
      submissionStatus: "submitted",
      openFindings: 0,
    },
    attention: [],
    recentLines: [],
    recentLineStats: { onTrack: 0, needsAttention: 0 },
    currentMonth: {
      month: 9,
      year: 2026,
      monthLabel: "September 2026",
      status: "on_target",
      achievement: 85,
      submittedCount: 4,
      draftCount: 0,
      totalLines: 4,
      byArea: [
        {
          areaId: 1,
          code: "MES",
          nameEn: "MOM",
          nameCn: "MOM",
          lineCount: 2,
          avgCompletionRate: 100,
          submittedWeeks: 1,
        },
        {
          areaId: 2,
          code: "IT",
          nameEn: "IT",
          nameCn: "IT",
          lineCount: 2,
          avgCompletionRate: 70,
          submittedWeeks: 1,
        },
      ],
    },
  };
}

describe("mapReportToOverview", () => {
  it("maps overview KPIs to home dashboard card slots", () => {
    const mapped = mapReportToOverview(reportModule, sampleMetrics(), "en");

    expect(mapped.stats[0]).toMatchObject({ value: "92.5%", trend: "— 0%" });
    expect(mapped.stats[1]).toMatchObject({ value: "100%", trend: "— 0%" });
    expect(mapped.stats[2]).toMatchObject({ value: "40%", trend: "— 0%" });
    expect(mapped.stats[3]).toMatchObject({ value: "100%", trend: "— 0%" });

    expect(mapped.reportWeeklyTrend).toHaveLength(2);
    expect(mapped.reportCurrentMonth?.achievement).toBe(85);
    expect(mapped.reportCurrentMonth?.byArea.map((r) => r.value)).toEqual([100, 70]);
    expect(mapped.reportCurrentMonth?.byArea.map((r) => r.label)).toEqual(["MOM", "IT"]);
  });
});
