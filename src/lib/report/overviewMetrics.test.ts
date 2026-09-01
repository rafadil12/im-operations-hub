import { describe, expect, it } from "vitest";
import { computeReportOverviewMetrics } from "./overviewMetrics";
import type { ReportArea, ReportLineRow } from "./types";

const areas: ReportArea[] = [
  { id: 1, code: "MES", nameEn: "MOM", nameCn: "MOM项", sortOrder: 1 },
  { id: 2, code: "LOGISTICS", nameEn: "Smart Logistics", nameCn: "智能物流", sortOrder: 2 },
  { id: 3, code: "IT", nameEn: "IT", nameCn: "IT", sortOrder: 3 },
  { id: 4, code: "SAFETY", nameEn: "Safety Officer", nameCn: "安全员", sortOrder: 4 },
];

function row(overrides: Partial<ReportLineRow> & Pick<ReportLineRow, "id" | "area_id">): ReportLineRow {
  return {
    week_id: 10,
    sub_item_id: 1,
    sub_item_name_en: "IT Operations",
    sub_item_name_cn: "IT运维",
    work_target_en: "Target",
    work_target_cn: "目标",
    weekly_completion_rate: 0.9,
    summary_en: "Done",
    summary_cn: "完成",
    plan_en: null,
    plan_cn: null,
    sort_order: 0,
    year: 2026,
    week_number: 35,
    area_code: "IT",
    submission_status: "submitted",
    ...overrides,
  };
}

describe("computeReportOverviewMetrics", () => {
  it("scopes KPIs to the selected week and computes deltas", () => {
    const rows: ReportLineRow[] = [
      row({ id: 1, area_id: 3, weekly_completion_rate: 1 }),
      row({
        id: 2,
        area_id: 3,
        sub_item_name_en: "Project",
        sub_item_name_cn: "项目",
        work_target_en: "MES Upgrade",
        work_target_cn: "MES升级",
        weekly_completion_rate: 0.65,
      }),
      row({
        id: 3,
        area_id: 1,
        week_id: 9,
        week_number: 34,
        weekly_completion_rate: 0.8,
        sub_item_name_en: "Traceability",
        sub_item_name_cn: "追溯",
      }),
    ];

    const metrics = computeReportOverviewMetrics({
      year: 2026,
      weekNumber: 35,
      areas,
      rows,
      submissions: [
        { weekId: 10, areaId: 1, status: "submitted", submittedAt: "2026-08-28T10:00:00Z" },
        { weekId: 10, areaId: 2, status: "draft" },
        { weekId: 10, areaId: 3, status: "submitted", submittedAt: "2026-08-29T10:00:00Z" },
        { weekId: 10, areaId: 4, status: "submitted", submittedAt: "2026-08-29T12:00:00Z" },
      ],
      weekId: 10,
    });

    expect(metrics.totalLines).toBe(2);
    expect(metrics.achievement.value).toBe(82.5);
    expect(metrics.workCompletion.value).toBe(100);
    expect(metrics.projectProgress?.value).toBe(65);
    expect(metrics.projects.activeCount).toBe(1);
    expect(metrics.projects.delayed).toBe(1);
    expect(metrics.dailyWork.planned).toBe(1);
    expect(metrics.dailyWork.completed).toBe(1);
    expect(metrics.divisions).toHaveLength(3);
    expect(metrics.safety.lineCount).toBe(0);
    expect(metrics.attention.length).toBeGreaterThan(0);
  });

  it("returns empty week metrics without throwing", () => {
    const metrics = computeReportOverviewMetrics({
      year: 2026,
      weekNumber: 20,
      areas,
      rows: [],
      submissions: [],
      weekId: null,
    });

    expect(metrics.totalLines).toBe(0);
    expect(metrics.achievement.value).toBe(0);
    expect(metrics.projects.activeCount).toBe(0);
    expect(metrics.projects.overallProgress).toBeNull();
    expect(metrics.attention).toHaveLength(0);
    expect(metrics.currentMonth).toBeDefined();
    expect(metrics.currentMonth.totalLines).toBeGreaterThanOrEqual(0);
  });
});
