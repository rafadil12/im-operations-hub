import { describe, expect, it } from "vitest";
import {
  countFullySubmittedWeeks,
  isWeekFullySubmitted,
  submissionStatusForArea,
} from "./submissionCount";

const areaIds = [1, 2, 3, 4];

function allAreasSubmitted(weekId: number) {
  return areaIds.map((areaId) => ({
    weekId,
    areaId,
    status: "submitted" as const,
  }));
}

describe("isWeekFullySubmitted", () => {
  it("requires every area to be SUBMITTED", () => {
    expect(
      isWeekFullySubmitted(
        [
          { weekId: 38, areaId: 1, status: "submitted" },
          { weekId: 38, areaId: 2, status: "submitted" },
          { weekId: 38, areaId: 3, status: "submitted" },
          { weekId: 38, areaId: 4, status: "draft" },
        ],
        38,
        areaIds
      )
    ).toBe(false);

    expect(isWeekFullySubmitted(allAreasSubmitted(38), 38, areaIds)).toBe(true);
  });
});

describe("countFullySubmittedWeeks", () => {
  it("counts 2/4 when the second week of the month is fully submitted", () => {
    const submissions = [...allAreasSubmitted(37), ...allAreasSubmitted(38)];
    expect(countFullySubmittedWeeks([37, 38, 39, 40], submissions, areaIds)).toBe(2);
  });

  it("stays 1/4 when the current week is missing any area", () => {
    const submissions = [
      ...allAreasSubmitted(37),
      { weekId: 38, areaId: 1, status: "submitted" },
      { weekId: 38, areaId: 2, status: "submitted" },
      { weekId: 38, areaId: 3, status: "draft" },
    ];
    expect(countFullySubmittedWeeks([37, 38, 39, 40], submissions, areaIds)).toBe(1);
  });

  it("stays 1/4 when the current week has no submissions", () => {
    expect(countFullySubmittedWeeks([37, 38, 39, 40], allAreasSubmitted(37), areaIds)).toBe(1);
  });
});

describe("submissionStatusForArea", () => {
  it("treats SUBMITTED as the status when duplicate rows exist", () => {
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
