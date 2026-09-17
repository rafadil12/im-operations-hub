import { describe, expect, it } from "vitest";
import {
  countUniqueWeekAreaStatuses,
  countWeekAreaSubmissions,
  submissionStatusForArea,
} from "./submissionCount";

describe("countWeekAreaSubmissions", () => {
  const areaIds = [1, 2, 3, 4];

  it("counts one SUBMITTED per area and ignores DRAFT and missing", () => {
    const counts = countWeekAreaSubmissions(
      [
        { weekId: 10, areaId: 1, status: "submitted" },
        { weekId: 10, areaId: 2, status: "submitted" },
        { weekId: 10, areaId: 3, status: "draft" },
      ],
      10,
      areaIds
    );

    expect(counts).toEqual({ submittedCount: 2, draftCount: 1, expectedCount: 4 });
  });

  it("counts 4 when every area is SUBMITTED", () => {
    const counts = countWeekAreaSubmissions(
      areaIds.map((areaId) => ({ weekId: 10, areaId, status: "submitted" as const })),
      10,
      areaIds
    );

    expect(counts.submittedCount).toBe(4);
    expect(counts.draftCount).toBe(0);
    expect(counts.expectedCount).toBe(4);
  });

  it("does not inflate when duplicate rows exist for the same week and area", () => {
    const counts = countWeekAreaSubmissions(
      [
        { weekId: 10, areaId: 1, status: "submitted" },
        { weekId: 10, areaId: 1, status: "submitted" },
        { weekId: 10, areaId: 1, status: "draft" },
        { weekId: 10, areaId: 2, status: "draft" },
        { weekId: 10, areaId: 2, status: "draft" },
      ],
      10,
      areaIds
    );

    expect(counts.submittedCount).toBe(1);
    expect(counts.draftCount).toBe(1);
  });

  it("treats a later SUBMITTED as submitted even if a DRAFT row is listed first", () => {
    expect(
      submissionStatusForArea(
        [
          { weekId: 10, areaId: 1, status: "draft" },
          { weekId: 10, areaId: 1, status: "submitted" },
        ],
        10,
        1
      )
    ).toBe("submitted");
  });
});

describe("countUniqueWeekAreaStatuses", () => {
  it("counts unique year-week-area completions across a month", () => {
    const counts = countUniqueWeekAreaStatuses([
      { weekId: 10, areaId: 1, status: "submitted" },
      { weekId: 10, areaId: 1, status: "submitted" },
      { weekId: 10, areaId: 2, status: "draft" },
      { weekId: 11, areaId: 1, status: "submitted" },
      { weekId: 11, areaId: 2, status: "submitted" },
    ]);

    expect(counts).toEqual({ submittedCount: 3, draftCount: 1 });
  });
});
