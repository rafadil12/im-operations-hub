import { describe, expect, it } from "vitest";
import { parseProjectPayload } from "./projectValidation";

describe("parseProjectPayload", () => {
  it("accepts a valid Excel-shaped payload", () => {
    const parsed = parseProjectPayload({
      reportDate: "2026-09-09",
      projectDepartment: "印尼基地各个系统优化",
      reporterName: "王春来",
      cycleLabel: "第37周",
      year: 2026,
      weekNumber: 37,
      lines: [
        {
          target: "LCA数据导入系统",
          mainTask: "",
          currentPriority: "高",
          planStart: "2026-07-16",
          planEnd: "2026-07-30",
          health: "healthy",
          lineStatus: "in_progress",
          progressRatio: 0.75,
          pic: "王春来，王俊",
          thisWeekProgress: "ERP入库数据表",
          nextWeekPlan: "",
        },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.weekNumber).toBe(37);
    expect(parsed.data.lines).toHaveLength(1);
    expect(parsed.data.lines[0].progressRatio).toBe(0.75);
  });

  it("rejects missing target rows", () => {
    const parsed = parseProjectPayload({
      reportDate: "2026-09-09",
      projectDepartment: "x",
      reporterName: "y",
      cycleLabel: "Week 37",
      year: 2026,
      weekNumber: 37,
      lines: [{ target: "", health: "healthy", lineStatus: "completed" }],
    });
    expect(parsed.ok).toBe(false);
  });
});
