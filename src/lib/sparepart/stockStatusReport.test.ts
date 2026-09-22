import { describe, expect, it } from "vitest";
import {
  currentMonthBounds,
  formatStockReportDate,
  stockStatusReportStatusLabel,
} from "./stockStatusReport";

describe("stockStatusReport", () => {
  it("formats CN and EN report dates", () => {
    expect(formatStockReportDate("2026-09-08 14:30:00", "cn")).toBe("2026年9月8日");
    expect(formatStockReportDate("2026-09-08", "en")).toBe("8 Sep 2026");
    expect(formatStockReportDate(null, "en")).toBe("");
  });

  it("maps status labels for Excel (not UI wording)", () => {
    expect(stockStatusReportStatusLabel("critical", "cn")).toBe("库存不足");
    expect(stockStatusReportStatusLabel("low", "cn")).toBe("低库存");
    expect(stockStatusReportStatusLabel("normal", "cn")).toBe("正常");
    expect(stockStatusReportStatusLabel("critical", "en")).toBe("Insufficient stock");
  });

  it("returns calendar-month bounds", () => {
    const { start, end } = currentMonthBounds(new Date(2026, 8, 22, 12, 0, 0));
    expect(start).toBe("2026-09-01 00:00:00");
    expect(end).toBe("2026-09-30 23:59:59");
  });
});
