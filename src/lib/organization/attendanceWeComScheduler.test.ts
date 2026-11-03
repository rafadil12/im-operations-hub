import { afterEach, describe, expect, it } from "vitest";

import {
  attendanceClock,
  shouldSendAttendanceWeCom,
} from "@/lib/organization/attendanceWeComScheduler";

afterEach(() => {
  delete process.env.ATTENDANCE_WECOM_HOUR;
});

describe("attendance WeCom scheduler", () => {
  it("resolves the attendance clock in the configured time zone", () => {
    expect(attendanceClock(new Date("2026-10-29T01:00:00.000Z"), "Asia/Jakarta")).toEqual({
      date: "2026-10-29",
      hour: 8,
      minute: 0,
    });
  });

  it("sends once at 08:20 during notification testing", () => {
    const clock = { date: "2026-10-29", hour: 8, minute: 20 };

    expect(shouldSendAttendanceWeCom(clock)).toBe(true);
    expect(shouldSendAttendanceWeCom(clock, "2026-10-29")).toBe(false);
    expect(shouldSendAttendanceWeCom({ ...clock, minute: 21 })).toBe(false);
  });

  it("supports a configured notification hour", () => {
    process.env.ATTENDANCE_WECOM_HOUR = "9";

    expect(shouldSendAttendanceWeCom({ date: "2026-10-29", hour: 9, minute: 20 })).toBe(true);
    expect(shouldSendAttendanceWeCom({ date: "2026-10-29", hour: 8, minute: 20 })).toBe(false);
  });
});
