import { describe, expect, it } from "vitest";
import { hasDetail } from "./dailyRemark";
import {
  addedLineDetail,
  countWeekLineChanges,
  projectCreateChanges,
  projectDeleteChanges,
  projectUpdateChanges,
  removedLineDetail,
  weekDeleteDetail,
  weekLineDetail,
  weekLineEditDetail,
  type ProjectRemarkLine,
  type ProjectRemarkSnapshot,
} from "./reportRemark";
import { renderRemark } from "./renderRemark";

const area = { field: "name", to: "MOM", toCn: "MOM项" };

function week(action: string, detail?: { to: string; toCn: string }) {
  return renderRemark(
    {
      action,
      summary: "",
      objectType: "week",
      objectRef: "41",
      changes: [area, ...(detail ? [{ field: "lines", to: detail.to, toCn: detail.toCn }] : [])],
    },
    "en"
  );
}

describe("report remarks", () => {
  it("names a week save by added, updated, and removed lines", () => {
    const before = [
      line(1, 0, "Keep"),
      line(2, 1, "Edit"),
      line(3, 2, "Drop"),
    ];
    const after = [
      { ...line(2, 1, "Edit"), workTargetEn: "Changed" },
      line(1, 0, "Keep"),
      { ...line(undefined, 2, "New"), id: undefined },
    ];
    const detail = weekLineDetail(countWeekLineChanges(before, after));
    expect(detail?.to).toBe("1 line added, 1 line updated, 1 line removed");
    expect(week("save", { to: detail!.to!, toCn: detail!.toCn! })).toBe(
      "Saved week 41 MOM: 1 line added, 1 line updated, 1 line removed"
    );
    expect(
      renderRemark(
        {
          action: "save",
          summary: "",
          objectType: "week",
          objectRef: "41",
          changes: [area, { field: "lines", to: detail!.to, toCn: detail!.toCn }],
        },
        "cn"
      )
    ).toBe("已保存第41周 MOM项：新增 1 行，更新 1 行，删除 1 行");
  });

  it("skips a week save that did not change lines and names a reorder", () => {
    const before = [line(1, 0, "A"), line(2, 1, "B")];
    expect(weekLineDetail(countWeekLineChanges(before, [line(1, 0, "A"), line(2, 1, "B")]))).toBeNull();
    const reordered = weekLineDetail(countWeekLineChanges(before, [line(2, 1, "B"), line(1, 0, "A")]));
    expect(week("save", { to: reordered!.to!, toCn: reordered!.toCn! })).toBe(
      "Saved week 41 MOM: line order updated"
    );
  });

  it("names submit, reopen, and delete for the week and area", () => {
    expect(week("submit")).toBe("Submitted week 41 MOM");
    expect(
      renderRemark({ action: "reopen", summary: "", objectType: "week", objectRef: "41", changes: [area] }, "cn")
    ).toBe("已重新打开第41周 MOM项");
    const removed = weekDeleteDetail(4);
    expect(week("delete", { to: removed.to!, toCn: removed.toCn! })).toBe("Deleted week 41 MOM: 4 lines");
  });

  it("names an added or removed week line and a completion change", () => {
    expect(addedLineDetail("Traceability", "追溯").to).toBe("1 line added, Traceability");
    expect(removedLineDetail("Traceability", "追溯").toCn).toBe("子项 追溯");
    const detail = weekLineEditDetail(
      {
        subItemId: 1,
        subItemNameEn: "Traceability",
        subItemNameCn: "追溯",
        workTargetEn: "A",
        workTargetCn: "甲",
        weeklyCompletionRate: 0.4,
        summaryEn: "Done",
        summaryCn: "完成",
        planEn: null,
        planCn: null,
      },
      {
        subItemId: 1,
        subItemNameEn: "Traceability",
        subItemNameCn: "追溯",
        workTargetEn: "A",
        workTargetCn: "甲",
        weeklyCompletionRate: 0.8,
        summaryEn: "Done",
        summaryCn: "完成",
        planEn: null,
        planCn: null,
      }
    );
    expect(week("update", { to: detail!.to!, toCn: detail!.toCn! })).toBe(
      "Updated week 41 MOM: Traceability completion from 40% to 80%"
    );
    expect(detail?.toCn).toBe("追溯 完成度从40%改为80%");
  });

  it("names a week or project attachment", () => {
    expect(
      renderRemark(
        {
          action: "create",
          summary: "",
          objectType: "attachment",
          objectRef: "weekly-mes.pptx",
          links: [{ type: "week", ref: "41", detailEn: "MOM", detailCn: "MOM项" }],
        },
        "en"
      )
    ).toBe("Added attachment weekly-mes.pptx to week 41 MOM");
    expect(
      renderRemark(
        {
          action: "delete",
          summary: "",
          objectType: "attachment",
          objectRef: "weekly-mes.pptx",
          links: [{ type: "week", ref: "41", detailEn: "MOM", detailCn: "MOM项" }],
        },
        "cn"
      )
    ).toBe("已删除附件 weekly-mes.pptx，第41周 MOM项");
    expect(
      renderRemark(
        {
          action: "create",
          summary: "",
          objectType: "attachment",
          objectRef: "plan.pdf",
          links: [{ type: "project", ref: "Line 3 upgrade" }],
        },
        "cn"
      )
    ).toBe("已添加附件 plan.pdf 到项目 Line 3 upgrade");
  });

  it("names a new sub-item and its area", () => {
    expect(
      renderRemark(
        {
          action: "create",
          summary: "",
          objectType: "sub-item",
          changes: [
            { field: "name", to: "Traceability", toCn: "追溯" },
            { field: "area", to: "MOM", toCn: "MOM项" },
          ],
        },
        "cn"
      )
    ).toBe("已创建子项 追溯：区域 MOM项");
  });

  it("names a project and the target fields that changed", () => {
    const before = snapshot("Line 3 upgrade", [target("Bearing", 0.4, "2026-10-01")]);
    const after = snapshot("Line 3 upgrade", [target("Bearing", 0.6, "2026-10-20")]);
    const changes = projectUpdateChanges(before, after);
    expect(hasDetail(changes)).toBe(true);
    expect(renderRemark({ action: "update", summary: "", objectType: "project", changes }, "en")).toBe(
      "Updated project Line 3 upgrade: progress of Bearing from 40% to 60%, plan end of Bearing from 2026-10-01 to 2026-10-20"
    );
    expect(renderRemark({ action: "update", summary: "", objectType: "project", changes }, "cn")).toBe(
      "已更新项目 Line 3 upgrade：Bearing 进度从40%改为60%，Bearing 计划完成从2026-10-01改为2026-10-20"
    );
    expect(hasDetail(projectUpdateChanges(before, before))).toBe(false);

    const created = projectCreateChanges(after.header, after.lines);
    expect(renderRemark({ action: "create", summary: "", objectType: "project", changes: created }, "en")).toBe(
      "Created project Line 3 upgrade: week 41, target Bearing"
    );
    const removed = projectDeleteChanges(after.header, after.lines);
    expect(renderRemark({ action: "delete", summary: "", objectType: "project", changes: removed }, "cn")).toBe(
      "已删除项目 Line 3 upgrade：第41周，目标 Bearing"
    );
  });
});

function line(id: number | undefined, sortOrder: number, target: string) {
  return {
    id,
    sortOrder,
    subItemId: 1,
    workTargetEn: target,
    workTargetCn: target,
    weeklyCompletionRate: 1,
    summaryEn: "Done",
    summaryCn: "完成",
    planEn: null,
    planCn: null,
  };
}

function target(name: string, progress: number, planEnd: string): ProjectRemarkLine {
  return {
    target: name,
    mainTask: "Install",
    currentPriority: null,
    planStart: "2026-09-01",
    planEnd,
    health: "healthy",
    lineStatus: "in_progress",
    progressRatio: progress,
    pic: "GALUH",
    thisWeekProgress: null,
    nextWeekPlan: null,
  };
}

function snapshot(department: string, lines: ProjectRemarkLine[]): ProjectRemarkSnapshot {
  return {
    header: {
      projectDepartment: department,
      reporterName: "GALUH",
      reportDate: "2026-10-08",
      cycleLabel: "Week 41",
      year: 2026,
      weekNumber: 41,
      status: "draft",
    },
    lines,
  };
}
