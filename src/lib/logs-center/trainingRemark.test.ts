import { describe, expect, it } from "vitest";
import { renderRemark } from "./renderRemark";
import {
  participantRemarkEvent,
  participantUpdateChanges,
  trainingCreateDetail,
  trainingDeleteDetail,
  trainingRemarkEvent,
  trainingUpdateDetail,
  type TrainingSnapshot,
} from "./trainingRemark";

const before: TrainingSnapshot = {
  sessionDate: "2026-10-01",
  divisionEn: "MES",
  divisionCn: "MES",
  topicEn: "FIRE DRILL",
  topicCn: "消防演练",
  participants: [
    { nameEn: "GALUH", nameCn: "加鲁" },
    { nameEn: "AULIA", nameCn: "奥利" },
  ],
  attachmentName: null,
};

function session(input: Parameters<typeof trainingRemarkEvent>[0], lang: "en" | "cn") {
  return renderRemark(trainingRemarkEvent(input), lang);
}

describe("training remarks", () => {
  it("names a new session by topic, date, division, and participant count", () => {
    const input = {
      action: "create" as const,
      topicEn: "FIRE DRILL",
      topicCn: "消防演练",
      detail: trainingCreateDetail({
        sessionDate: "2026-10-08",
        divisionEn: "MES",
        divisionCn: "MES",
        participants: Array.from({ length: 12 }, (_, index) => ({
          nameEn: `PERSON ${index + 1}`,
          nameCn: `人员 ${index + 1}`,
        })),
        attachmentName: "attendance.pdf",
      }),
    };
    expect(session(input, "en")).toBe(
      "Created session FIRE DRILL: date 2026-10-08, division MES, 12 participants, attachment attendance.pdf"
    );
    expect(session(input, "cn")).toBe(
      "已创建培训 消防演练：日期 2026-10-08，部门 MES，12 名参与者，附件 attendance.pdf"
    );
  });

  it("names a session update by topic, division, and the people who changed", () => {
    const detail = trainingUpdateDetail(before, {
      ...before,
      sessionDate: "2026-10-08",
      divisionEn: "IT",
      divisionCn: "IT",
      topicEn: "FIRE SAFETY",
      topicCn: "消防安全",
      participants: [
        { nameEn: "GALUH", nameCn: "加鲁" },
        { nameEn: "BUDI", nameCn: "布迪" },
      ],
      attachmentName: "notes.pdf",
    });
    const input = {
      action: "update" as const,
      topicEn: "FIRE SAFETY",
      topicCn: "消防安全",
      detail,
    };
    expect(session(input, "en")).toBe(
      "Updated session FIRE SAFETY: date from 2026-10-01 to 2026-10-08, division from MES to IT, topic from FIRE DRILL to FIRE SAFETY, added BUDI, removed AULIA, attachment notes.pdf added"
    );
    expect(session(input, "cn")).toBe(
      "已更新培训 消防安全：日期从2026-10-01改为2026-10-08，部门从MES改为IT，主题从消防演练改为消防安全，已添加 布迪，已移除 奥利，已添加附件 notes.pdf"
    );
  });

  it("returns no detail when a session save changes nothing", () => {
    expect(trainingUpdateDetail(before, { ...before, topicEn: "  fire   drill  " })).toBeNull();
  });

  it("names a deleted session and a participant master change", () => {
    expect(
      session(
        {
          action: "delete",
          topicEn: "FIRE DRILL",
          topicCn: "消防演练",
          detail: trainingDeleteDetail({ sessionDate: "2026-10-08", participantCount: 12 }),
        },
        "en"
      )
    ).toBe("Deleted session FIRE DRILL: date 2026-10-08, 12 participants");

    expect(
      renderRemark(
        participantRemarkEvent({ action: "create", nameEn: "GALUH SAPIN SAPUTRA", nameCn: "加鲁" }),
        "en"
      )
    ).toBe("Created participant GALUH SAPIN SAPUTRA");
    expect(
      renderRemark(
        participantRemarkEvent({ action: "create", nameEn: "GALUH SAPIN SAPUTRA", nameCn: "加鲁" }),
        "cn"
      )
    ).toBe("已创建参与者 加鲁");

    const changes = participantUpdateChanges(
      { nameCn: "加鲁", isActive: false },
      { nameCn: "新加鲁" }
    );
    expect(
      renderRemark(
        participantRemarkEvent({
          action: "update",
          nameEn: "GALUH",
          nameCn: "新加鲁",
          changes,
        }),
        "cn"
      )
    ).toBe("已更新参与者 新加鲁：中文名称从加鲁改为新加鲁，状态从停用改为启用");
    expect(participantUpdateChanges({ nameCn: "加鲁", isActive: true }, { nameCn: "加鲁" })).toBeNull();
  });
});
