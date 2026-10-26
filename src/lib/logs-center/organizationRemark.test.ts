import { describe, expect, it } from "vitest";
import { renderRemark } from "./renderRemark";
import {
  attendanceSyncEvent,
  employeeCreateEvent,
  employeeDeleteEvent,
  employeeUpdateEvent,
  leaveCancelEvent,
  leaveEditEvent,
  leaveOaEvent,
  leaveStatusEvent,
  leaveSubmitEvent,
  offDayEvent,
  rotationEvent,
  scheduleEvent,
  shiftAssignEvent,
  shiftRosterEvent,
  type EmployeeFields,
  type LeaveSnapshot,
} from "./organizationRemark";

const identity = { employeeNo: "62000970", nameEn: "GALUH", nameCn: "加鲁" };

function fields(overrides: Partial<EmployeeFields> = {}): EmployeeFields {
  return {
    positionEn: "Operator",
    positionCn: "操作员",
    divisionEn: "MES",
    divisionCn: "MES",
    status: "Active",
    employmentType: "Permanent",
    joinDate: "",
    location: "",
    team: "",
    managerNo: "",
    managerEn: "",
    managerCn: "",
    ...overrides,
  };
}

function say(event: Parameters<typeof renderRemark>[0] | null, lang: "en" | "cn") {
  return event ? renderRemark(event, lang) : "";
}

const leave: LeaveSnapshot = {
  employeeNo: "62000970",
  nameEn: "GALUH",
  nameCn: "加鲁",
  date: "2026-10-09",
  type: "AL",
  startTime: "08:00:00",
  endTime: "17:00:00",
};

describe("organization remarks", () => {
  it("names a new employee by number, name, position, and division", () => {
    const event = employeeCreateEvent(identity, fields());
    expect(say(event, "en")).toBe(
      "Created employee 62000970 GALUH: position Operator, division MES, status Active, type Permanent",
    );
    expect(say(event, "cn")).toBe(
      "已创建员工 62000970 加鲁：职位 操作员，部门 MES，状态 在职，雇佣类型 正式员工",
    );
  });

  it("lists the employee fields that actually changed", () => {
    const event = employeeUpdateEvent(
      identity,
      fields(),
      fields({ positionEn: "Leader", positionCn: "组长", status: "On Leave" }),
    );
    expect(say(event, "en")).toBe(
      "Updated employee 62000970 GALUH: position from Operator to Leader, status from Active to On Leave",
    );
    expect(say(event, "cn")).toBe(
      "已更新员工 62000970 加鲁：职位从操作员改为组长，状态从在职改为休假",
    );
  });

  it("says deactivated when the only change is Inactive", () => {
    const event = employeeUpdateEvent(identity, fields(), fields({ status: "Inactive" }));
    expect(say(event, "en")).toBe("Deactivated employee 62000970 GALUH");
    expect(say(event, "cn")).toBe("已停用员工 62000970 加鲁");
  });

  it("keeps the other diffs when an employee is deactivated", () => {
    const event = employeeUpdateEvent(
      identity,
      fields(),
      fields({ status: "Inactive", positionEn: "Leader", positionCn: "组长" }),
    );
    expect(say(event, "en")).toBe(
      "Deactivated employee 62000970 GALUH: position from Operator to Leader",
    );
    expect(say(event, "cn")).toBe("已停用员工 62000970 加鲁：职位从操作员改为组长");
  });

  it("names a reactivation as a status change", () => {
    const event = employeeUpdateEvent(identity, fields({ status: "Inactive" }), fields({ status: "Active" }));
    expect(say(event, "en")).toBe("Updated employee 62000970 GALUH: status from Inactive to Active");
    expect(say(event, "cn")).toBe("已更新员工 62000970 加鲁：状态从停用改为在职");
  });

  it("writes no employee row when the save changes nothing", () => {
    expect(employeeUpdateEvent(identity, fields(), fields())).toBeNull();
  });

  it("names a deleted employee by number, name, position, and division", () => {
    const event = employeeDeleteEvent(identity, fields());
    expect(say(event, "en")).toBe("Deleted employee 62000970 GALUH: position Operator, division MES");
    expect(say(event, "cn")).toBe("已删除员工 62000970 加鲁：职位 操作员，部门 MES");
  });

  it("names a submitted leave by type, employee, date, and time", () => {
    const event = leaveSubmitEvent(leave);
    expect(say(event, "en")).toBe(
      "Submitted leave Annual Leave for 62000970 GALUH on 2026-10-09, 08:00-17:00",
    );
    expect(say(event, "cn")).toBe("已提交请假 年假，员工 62000970 加鲁，2026-10-09，08:00至17:00");
  });

  it("names leave approval and rejection", () => {
    const approved = leaveStatusEvent(leave, "Pending", "Approved");
    expect(say(approved, "en")).toBe(
      "Updated leave Annual Leave for 62000970 GALUH on 2026-10-09, 08:00-17:00: status from Pending to Approved",
    );
    expect(say(approved, "cn")).toBe(
      "已更新请假 年假，员工 62000970 加鲁，2026-10-09，08:00至17:00：状态从待审核改为已批准",
    );
    const rejected = leaveStatusEvent(leave, "Pending", "Rejected");
    expect(say(rejected, "en")).toContain("status from Pending to Rejected");
    expect(say(rejected, "cn")).toContain("状态从待审核改为已拒绝");
  });

  it("names a cancelled leave", () => {
    const event = leaveCancelEvent(leave);
    expect(say(event, "en")).toBe(
      "Cancelled leave Annual Leave for 62000970 GALUH on 2026-10-09, 08:00-17:00",
    );
    expect(say(event, "cn")).toBe("已取消请假 年假，员工 62000970 加鲁，2026-10-09，08:00至17:00");
  });

  it("lists the leave fields that changed", () => {
    const event = leaveEditEvent(leave, {
      ...leave,
      type: "MC",
      startTime: "13:00",
      endTime: "17:00",
    });
    expect(say(event, "en")).toBe(
      "Updated leave Sick Leave for 62000970 GALUH on 2026-10-09, 13:00-17:00: type from Annual Leave to Sick Leave, time from 08:00-17:00 to 13:00-17:00",
    );
    expect(say(event, "cn")).toBe(
      "已更新请假 病假，员工 62000970 加鲁，2026-10-09，13:00至17:00：类型从年假改为病假，时间从08:00至17:00改为13:00至17:00",
    );
  });

  it("names an OA number change and skips an unchanged OA save", () => {
    const event = leaveOaEvent(leave, "", "LV-014");
    expect(say(event, "en")).toContain("OA number from none to LV-014");
    expect(say(event, "cn")).toContain("OA号从无改为LV-014");
    expect(leaveOaEvent(leave, "LV-014", "LV-014")).toBeNull();
    expect(leaveEditEvent(leave, leave)).toBeNull();
  });

  it("names a daily attendance sync by month and row counts", () => {
    const event = attendanceSyncEvent(2026, 10, 120, 30);
    expect(say(event, "en")).toBe(
      "Synced daily attendance for October 2026: 120 rows inserted, 30 rows updated",
    );
    expect(say(event, "cn")).toBe("已同步每日考勤，2026年10月：新增 120 行，更新 30 行");
    expect(say(attendanceSyncEvent(2026, 10, 1, 0), "en")).toBe(
      "Synced daily attendance for October 2026: 1 row",
    );
    expect(attendanceSyncEvent(2026, 10, 0, 0)).toBeNull();
  });

  it("names a generated shift roster by month", () => {
    const event = shiftRosterEvent(2026, 10);
    expect(say(event, "en")).toBe("Generated shift roster for October 2026");
    expect(say(event, "cn")).toBe("已生成排班，2026年10月");
  });

  it("names a shift assignment with the screen shift code", () => {
    const created = shiftAssignEvent({
      employeeNo: "62000970",
      nameEn: "GALUH",
      nameCn: "加鲁",
      before: null,
      after: { shift: "D/S", excluded: false },
    });
    expect(say(created, "en")).toBe("Assigned shift D/S to 62000970 GALUH");
    expect(say(created, "cn")).toBe("已分配班次 D/S 给 62000970 加鲁");
    const updated = shiftAssignEvent({
      employeeNo: "62000970",
      nameEn: "GALUH",
      nameCn: "加鲁",
      before: { shift: "D/S", excluded: false },
      after: { shift: "N/S", excluded: true },
    });
    expect(say(updated, "en")).toBe(
      "Updated shift for 62000970 GALUH: shift from D/S to N/S, excluded from no to yes",
    );
    expect(say(updated, "cn")).toBe("已更新班次 62000970 加鲁：班次从D/S改为N/S，排除从否改为是");
    expect(
      shiftAssignEvent({
        employeeNo: "62000970",
        before: { shift: "D/S", excluded: false },
        after: { shift: "D/S", excluded: false },
      }),
    ).toBeNull();
  });

  it("names a work schedule by employee, date, and type", () => {
    const created = scheduleEvent({
      employeeNo: "62000970",
      nameEn: "GALUH",
      nameCn: "加鲁",
      date: "2026-10-08",
      toType: "1",
    });
    expect(say(created, "en")).toBe("Set schedule 1 for 62000970 GALUH on 2026-10-08");
    expect(say(created, "cn")).toBe("已设置排班 1，员工 62000970 加鲁，2026-10-08");
    const updated = scheduleEvent({
      employeeNo: "62000970",
      nameEn: "GALUH",
      nameCn: "加鲁",
      date: "2026-10-08",
      fromType: "1",
      toType: "4",
    });
    expect(say(updated, "en")).toBe(
      "Updated schedule for 62000970 GALUH on 2026-10-08: schedule from 1 to 4",
    );
    const removed = scheduleEvent({
      employeeNo: "62000970",
      date: "2026-10-08",
      fromType: "OFF",
    });
    expect(say(removed, "en")).toBe("Removed schedule OFF for 62000970 on 2026-10-08");
    expect(
      scheduleEvent({ employeeNo: "62000970", date: "2026-10-08", fromType: "1", toType: "1" }),
    ).toBeNull();
  });

  it("names off days and collapses a long date list", () => {
    const saved = offDayEvent({
      action: "create",
      employeeNo: "62000970",
      nameEn: "GALUH",
      nameCn: "加鲁",
      dates: ["2026-10-08", "2026-10-09"],
    });
    expect(say(saved, "en")).toBe("Set off day for 62000970 GALUH on 2026-10-08, 2026-10-09");
    expect(say(saved, "cn")).toBe("已设置休息日，员工 62000970 加鲁，2026-10-08，2026-10-09");
    const many = offDayEvent({
      action: "create",
      employeeNo: "62000970",
      dates: ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"],
    });
    expect(say(many, "en")).toBe("Set off day for 62000970: 5 days");
    expect(say(many, "cn")).toBe("已设置休息日，员工 62000970：5 天");
    const removed = offDayEvent({
      action: "delete",
      employeeNo: "62000970",
      nameEn: "GALUH",
      nameCn: "加鲁",
      dates: ["2026-10-08"],
    });
    expect(say(removed, "en")).toBe("Removed off day for 62000970 GALUH on 2026-10-08");
    expect(say(removed, "cn")).toBe("已删除休息日，员工 62000970 加鲁，2026-10-08");
  });

  it("names rotation pairs with employee, name, and shift", () => {
    const event = rotationEvent([
      {
        group: "PAIR_A",
        members: [
          { employeeNo: "62000970", nameEn: "GALUH", nameCn: "加鲁", shift: "D/S" },
          { employeeNo: "62000971", nameEn: "AULIA", nameCn: "奥利", shift: "N/S" },
        ],
      },
      {
        group: "PAIR_B",
        members: [
          { employeeNo: "62000972", nameEn: "BUDI", nameCn: "布迪", shift: "D/S" },
          { employeeNo: "62000973", nameEn: "CITRA", nameCn: "西特拉", shift: "N/S" },
        ],
      },
    ]);
    expect(say(event, "en")).toBe(
      "Saved rotation pairs: PAIR_A 62000970 GALUH D/S, 62000971 AULIA N/S; PAIR_B 62000972 BUDI D/S, 62000973 CITRA N/S",
    );
    expect(say(event, "cn")).toBe(
      "已保存轮班配对：PAIR_A 62000970 加鲁 D/S，62000971 奥利 N/S；PAIR_B 62000972 布迪 D/S，62000973 西特拉 N/S",
    );
  });
});
