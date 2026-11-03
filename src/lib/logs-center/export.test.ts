import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildLogsCenterExport } from "./export";
import type { LogsCenterEventRow } from "./listQuery";

const sample: LogsCenterEventRow = {
  id: 54,
  created_at: "2026-10-28 15:22:06",
  module: "auth",
  action: "login",
  object_type: "session",
  object_ref: null,
  summary: "Signed in",
  summary_cn: "已登录",
  changes_json: [{ field: "result", to: "signed_in" }],
  links_json: null,
  ip_address: "127.0.0.1",
  user_agent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  actor_label: "RIZKI AL FADIL",
  employee_no: "62000970",
  name_en: "RIZKI AL FADIL",
  name_cn: "里兹基",
};

describe("buildLogsCenterExport", () => {
  it("writes bilingual headers and localized remarks", async () => {
    const enBuffer = await buildLogsCenterExport([sample], "en");
    const enBook = new ExcelJS.Workbook();
    await enBook.xlsx.load(enBuffer);
    const enSheet = enBook.worksheets[0];
    expect(enSheet.name).toBe("Logs Center");
    expect(enSheet.getRow(1).getCell(1).value).toBe("Time");
    expect(enSheet.getRow(1).getCell(6).value).toBe("Remarks");
    expect(enSheet.getRow(2).getCell(4).value).toBe("LOGIN");
    expect(enSheet.getRow(2).getCell(6).value).toBe("Signed in");
    expect(enSheet.getRow(2).getCell(8).value).toBe("127.0.0.1");

    const cnBuffer = await buildLogsCenterExport(
      [{ ...sample, action: "submit", changes_json: [{ field: "result", to: "imported" }], object_type: "activities", object_ref: "3", summary: "Imported 3 activities", summary_cn: "已导入 3 个活动" }],
      "cn"
    );
    const cnBook = new ExcelJS.Workbook();
    await cnBook.xlsx.load(cnBuffer);
    const cnSheet = cnBook.worksheets[0];
    expect(cnSheet.name).toBe("日志中心");
    expect(cnSheet.getRow(1).getCell(1).value).toBe("时间");
    expect(cnSheet.getRow(2).getCell(4).value).toBe("UPDATE");
    expect(cnSheet.getRow(2).getCell(6).value).toBe("已导入 3 个活动");
  });
});
