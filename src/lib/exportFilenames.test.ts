import { describe, expect, it } from "vitest";
import {
  contentDispositionAttachment,
  exportFilename,
  parseContentDispositionFilename,
} from "./exportFilenames";

describe("exportFilenames", () => {
  it("returns bilingual base names", () => {
    expect(exportFilename("sparepartStockStatus", "en")).toBe(
      "sparepart-stock-status-report.xlsx"
    );
    expect(exportFilename("sparepartStockStatus", "cn")).toBe("备件库存状态报表.xlsx");
    expect(exportFilename("trainingSessions", "cn")).toBe("培训记录.xlsx");
  });

  it("appends date range for daily activities", () => {
    expect(
      exportFilename("dailyActivities", "cn", {
        start: "2026-09-01",
        end: "2026-09-22",
      })
    ).toBe("日常活动导出_2026-09-01_2026-09-22.xlsx");
  });

  it("builds and parses Content-Disposition with UTF-8 filename*", () => {
    const header = contentDispositionAttachment("备件库存状态报表.xlsx");
    expect(header).toMatch(/^attachment; filename="[^"]+\.xlsx"; filename\*=UTF-8''/);
    expect(header).not.toContain("备件");
    expect(parseContentDispositionFilename(header)).toBe("备件库存状态报表.xlsx");
  });
});
