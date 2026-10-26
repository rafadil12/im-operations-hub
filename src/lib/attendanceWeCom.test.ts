import { describe, expect, it } from "vitest";

import {
  dateInTimeZone,
  formatAttendanceRoster,
  type AttendanceRosterRow,
} from "@/lib/attendanceWeCom";
import { splitWeComMarkdown } from "@/lib/attendanceWeComNotification";

const base: AttendanceRosterRow = {
  employee_no: "62000001",
  name_en: "Staff One",
  name_cn: "员工一",
  division_name_en: "IT",
  division_name_cn: "信息技术",
  schedule_type: "D",
  leave_type: null,
  is_rolling: 1,
};

describe("attendance WeCom report", () => {
  it("formats the roster summary and employee groups", () => {
    const message = formatAttendanceRoster({
      date: "2026-10-26",
      scheduled: [base],
      working: [base],
      leave: [],
      off: [],
    });

    expect(message).toContain("Daily Staff Attendance & Shift Summary");
    expect(message).toContain("Expected in: **1**");
    expect(message).toContain("员工一 / Staff One (62000001) · IT");
  });

  it("uses the configured timezone when resolving the report date", () => {
    const instant = new Date("2026-10-25T17:30:00.000Z");
    expect(dateInTimeZone(instant, "Asia/Jakarta")).toBe("2026-10-26");
  });

  it("splits long reports below the WeCom markdown payload limit", () => {
    const chunks = splitWeComMarkdown(
      Array.from({ length: 300 }, (_, i) => `• Staff ${i}`).join("\n")
    );
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => Buffer.byteLength(chunk, "utf8") <= 3_800)).toBe(true);
  });
});
