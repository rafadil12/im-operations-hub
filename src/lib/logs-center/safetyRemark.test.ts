import { describe, expect, it } from "vitest";
import { renderRemark } from "./renderRemark";
import {
  safetyCreateDetail,
  safetyRemarkEvent,
  safetyUpdateDetail,
  type SafetySnapshot,
} from "./safetyRemark";

const before: SafetySnapshot = {
  status: "completed",
  submissionDate: "2026-10-01",
  picEn: "GALUH",
  picCn: "加鲁",
  location: "Line 1",
  descriptionEn: "Before",
  descriptionCn: "之前",
};

function sentence(input: Parameters<typeof safetyRemarkEvent>[0], lang: "en" | "cn") {
  return renderRemark(safetyRemarkEvent(input), lang);
}

describe("safety remarks", () => {
  it("names a weekly submit by activity, week, and month", () => {
    const detail = safetyCreateDetail({ fileCount: 2 });
    const input = {
      action: "submit" as const,
      kind: "weekly" as const,
      week: 1,
      year: 2026,
      month: 10,
      activityType: "training",
      detail,
    };
    expect(sentence(input, "en")).toBe(
      "Submitted weekly safety report, week 1 of October 2026: Safety Training Records, 2 files"
    );
    expect(sentence(input, "cn")).toBe(
      "已提交周安全报告，2026年10月 第1周：安全培训记录，2 个文件"
    );
  });

  it("names a weekly update by the fields and files that changed", () => {
    const detail = safetyUpdateDetail(
      before,
      {
        ...before,
        picEn: "AULIA",
        picCn: "奥利",
        location: "Line 2",
        descriptionEn: "After",
      },
      true
    );
    const input = {
      action: "update" as const,
      kind: "weekly" as const,
      week: 1,
      year: 2026,
      month: 10,
      activityType: "hse_tuesday",
      detail,
    };
    expect(sentence(input, "en")).toBe(
      "Updated weekly safety report, week 1 of October 2026: Regular HSE Meeting, PIC from GALUH to AULIA, location from Line 1 to Line 2, description updated, files replaced"
    );
    expect(sentence(input, "cn")).toBe(
      "已更新周安全报告，2026年10月 第1周：HSE例会，负责人从加鲁改为奥利，地点从Line 1改为Line 2，描述已更新，文件已替换"
    );
  });

  it("returns no detail when a weekly save changes nothing", () => {
    expect(safetyUpdateDetail(before, { ...before }, false)).toBeNull();
    expect(
      safetyUpdateDetail(before, { ...before, location: "  Line 1  ", submissionDate: "2026-10-01 00:00:00" }, false)
    ).toBeNull();
  });

  it("names a monthly submit, a safety case, and a reward finding", () => {
    const drill = {
      action: "submit" as const,
      kind: "monthly" as const,
      year: 2026,
      month: 10,
      activityType: "fire_drill",
      detail: safetyCreateDetail({ fileCount: 1 }),
    };
    expect(sentence(drill, "en")).toBe(
      "Submitted monthly safety report, October 2026: Fire Drill Simulation, 1 file"
    );
    expect(sentence(drill, "cn")).toBe("已提交月安全报告，2026年10月：消防演练，1 个文件");

    const hazard = {
      action: "submit" as const,
      kind: "monthly" as const,
      year: 2026,
      month: 10,
      activityType: "safety_case",
      detail: safetyCreateDetail({ fileCount: 0, status: "not_applicable" }),
    };
    expect(sentence(hazard, "en")).toBe(
      "Submitted monthly safety report, October 2026: Hazard Finding / Case, status No Case"
    );
    expect(sentence(hazard, "cn")).toBe("已提交月安全报告，2026年10月：安全隐患 / 案件，状态无案件");

    const reward = {
      action: "submit" as const,
      kind: "monthly" as const,
      year: 2026,
      month: 10,
      activityType: "reward_finding",
      activityIndex: 2,
      submissionDate: "2026-10-12",
      detail: safetyCreateDetail({ fileCount: 2 }),
    };
    expect(sentence(reward, "en")).toBe(
      "Submitted monthly safety report, October 2026: Reward-Based Finding 2, 2026-10-12, 2 files"
    );
    expect(sentence(reward, "cn")).toBe(
      "已提交月安全报告，2026年10月：奖励发现 2，2026-10-12，2 个文件"
    );
  });

  it("names a monthly status change and a removed report", () => {
    const detail = safetyUpdateDetail(
      { ...before, status: "not_applicable" },
      { ...before, status: "case_found" },
      true
    );
    expect(
      sentence(
        {
          action: "update",
          kind: "monthly",
          year: 2026,
          month: 10,
          activityType: "safety_case",
          detail,
        },
        "en"
      )
    ).toBe(
      "Updated monthly safety report, October 2026: Hazard Finding / Case, status from No Case to Case Found, files replaced"
    );

    expect(
      sentence(
        {
          action: "delete",
          kind: "monthly",
          year: 2026,
          month: 10,
          activityType: "fire_drill",
        },
        "cn"
      )
    ).toBe("已删除月安全报告，2026年10月：消防演练");
  });
});
