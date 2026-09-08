import { describe, expect, it } from "vitest";
import type { ReportLine } from "./types";
import {
  WEEK_REPORT_ALREADY_EXISTS,
  buildAreaWeekReportRows,
  createModeConflictMessage,
  weekReportStatusFromLines,
} from "./weekReportIdentity";

function line(partial: Partial<ReportLine> & Pick<ReportLine, "id" | "weekNumber">): ReportLine {
  return {
    weekId: 10,
    areaId: 1,
    subItemId: 1,
    subItemNameEn: "Ops",
    subItemNameCn: "运维",
    workTargetEn: "Target",
    workTargetCn: "目标",
    weeklyCompletionRate: 1,
    summaryEn: "Summary",
    summaryCn: "总结",
    planEn: null,
    planCn: null,
    sortOrder: 0,
    year: 2026,
    submissionStatus: "draft",
    ...partial,
  };
}

describe("createModeConflictMessage", () => {
  it("allows create when no lines exist for the week", () => {
    expect(createModeConflictMessage(0)).toBeNull();
  });

  it("blocks create when a report already has lines", () => {
    expect(createModeConflictMessage(3)).toBe(WEEK_REPORT_ALREADY_EXISTS);
  });
});

describe("weekReportStatusFromLines", () => {
  it("returns none when there are no lines", () => {
    expect(weekReportStatusFromLines([])).toBe("none");
  });

  it("returns submitted if any line is submitted", () => {
    expect(
      weekReportStatusFromLines([
        line({ id: 1, weekNumber: 35, submissionStatus: "draft" }),
        line({ id: 2, weekNumber: 35, submissionStatus: "submitted" }),
      ])
    ).toBe("submitted");
  });

  it("returns draft when lines exist and none are submitted", () => {
    expect(weekReportStatusFromLines([line({ id: 1, weekNumber: 35 })])).toBe("draft");
  });
});

describe("buildAreaWeekReportRows", () => {
  it("builds independent week rows and leaves empty weeks as No Report", () => {
    const rows = buildAreaWeekReportRows({
      year: 2026,
      weekNumbers: [35, 34, 33],
      lines: [
        line({ id: 1, weekNumber: 35, sortOrder: 1, submissionStatus: "draft" }),
        line({ id: 2, weekNumber: 35, sortOrder: 0, submissionStatus: "draft" }),
        line({
          id: 3,
          weekNumber: 34,
          weekId: 11,
          submissionStatus: "submitted",
          submittedByLabel: "Super Admin",
        }),
      ],
    });

    expect(rows.map((row) => [row.weekNumber, row.status, row.lineCount])).toEqual([
      [35, "draft", 2],
      [34, "submitted", 1],
      [33, "none", 0],
    ]);
    expect(rows[0].lines.map((item) => item.id)).toEqual([2, 1]);
    expect(rows[1].lastUpdatedBy).toBe("Super Admin");
    expect(rows[2].weekId).toBeNull();
  });

  it("does not mix another area's lines into the selected area rows", () => {
    const momLines = [line({ id: 1, weekNumber: 35, areaId: 1, submissionStatus: "submitted" })];
    const rows = buildAreaWeekReportRows({
      year: 2026,
      weekNumbers: [35],
      lines: momLines,
    });
    expect(rows[0].status).toBe("submitted");

    const itRows = buildAreaWeekReportRows({
      year: 2026,
      weekNumbers: [35],
      lines: [],
    });
    expect(itRows[0].status).toBe("none");
    expect(itRows[0].lineCount).toBe(0);
  });

  it("keeps lastUpdatedAt as the database wall-clock time (not UTC ISO)", () => {
    const rows = buildAreaWeekReportRows({
      year: 2026,
      weekNumbers: [37],
      lines: [
        line({
          id: 1,
          weekNumber: 37,
          updatedAt: "2026-09-08 16:47:12",
          submittedAt: "2026-09-08 10:00:00",
        }),
      ],
    });
    expect(rows[0].lastUpdatedAt).toBe("2026-09-08 16:47:12");
  });
});
