import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseSparepartItemsWorkbook } from "./import";

async function workbookBuffer(rows: unknown[][], sheetName = "Items"): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  for (const row of rows) {
    ws.addRow(row);
  }
  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

const header = [
  "Code",
  "Name EN",
  "Name CN",
  "Brand EN",
  "Brand CN",
  "Model",
  "Category",
  "Min Stock",
  "UoM",
  "Notes",
];

describe("parseSparepartItemsWorkbook", () => {
  it("parses a valid row and defaults empty UoM to PCS", async () => {
    const buffer = await workbookBuffer([
      header,
      ["IT00099", "Sensor", "传感器", "Acme", "", "S1", "IT", 3, "", "note"],
    ]);
    const result = await parseSparepartItemsWorkbook(buffer);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        code: "IT00099",
        name_en: "Sensor",
        name_cn: "传感器",
        category_code: "IT",
        min_stock: 3,
        uom_code: "PCS",
        notes: "note",
      });
    }
  });

  it("maps ASSEMBLY / ASM category aliases", async () => {
    const buffer = await workbookBuffer([
      header,
      ["ASM001", "Bolt", "螺栓", "", "", "", "ASSEMBLY", 0, "PCS", ""],
      ["ASM002", "Nut", "螺母", "", "", "", "ASM", 1, "PACK", ""],
    ]);
    const result = await parseSparepartItemsWorkbook(buffer);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items.map((i) => i.category_code)).toEqual(["ASSEMBLY", "ASSEMBLY"]);
      expect(result.items[1]?.uom_code).toBe("PACK");
    }
  });

  it("rejects missing required headers", async () => {
    const buffer = await workbookBuffer([["Code", "Name EN", "Category"], ["IT1", "A", "IT"]]);
    const result = await parseSparepartItemsWorkbook(buffer);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Name CN|Min Stock/i);
    }
  });

  it("collects row errors for blank code, missing names, bad category, and bad min stock", async () => {
    const buffer = await workbookBuffer([
      header,
      ["", "Sensor", "传感器", "", "", "", "IT", 1, "PCS", ""],
      ["IT1", "", "传感器", "", "", "", "IT", 1, "PCS", ""],
      ["IT2", "Sensor", "", "", "", "", "IT", 1, "PCS", ""],
      ["IT3", "Sensor", "传感器", "", "", "", "WIDGET", 1, "PCS", ""],
      ["IT4", "Sensor", "传感器", "", "", "", "IT", -1, "PCS", ""],
      ["IT5", "Sensor", "传感器", "", "", "", "", 1, "PCS", ""],
    ]);
    const result = await parseSparepartItemsWorkbook(buffer);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "code")).toBe(true);
      expect(result.errors.some((e) => e.field === "name_en")).toBe(true);
      expect(result.errors.some((e) => e.field === "name_cn")).toBe(true);
      expect(result.errors.some((e) => e.field === "category")).toBe(true);
      expect(result.errors.some((e) => e.field === "min_stock")).toBe(true);
    }
  });

  it("rejects duplicate codes within the file (case-insensitive)", async () => {
    const buffer = await workbookBuffer([
      header,
      ["IT00001", "A", "甲", "", "", "", "IT", 0, "PCS", ""],
      ["it00001", "B", "乙", "", "", "", "IT", 0, "PCS", ""],
    ]);
    const result = await parseSparepartItemsWorkbook(buffer);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
    }
  });

  it("skips fully empty rows and reports no data when only blanks", async () => {
    const emptyOnly = await workbookBuffer([header, ["", "", "", "", "", "", "", "", "", ""]]);
    const emptyResult = await parseSparepartItemsWorkbook(emptyOnly);
    expect(emptyResult.ok).toBe(false);
    if (!emptyResult.ok) {
      expect(emptyResult.error).toMatch(/No data rows/i);
    }

    const mixed = await workbookBuffer([
      header,
      ["", "", "", "", "", "", "", "", "", ""],
      ["MES001", "Gate", "闸机", "", "", "", "MES", 2, "PCS", ""],
    ]);
    const mixedResult = await parseSparepartItemsWorkbook(mixed);
    expect(mixedResult.ok).toBe(true);
    if (mixedResult.ok) {
      expect(mixedResult.items).toHaveLength(1);
      expect(mixedResult.items[0]?.code).toBe("MES001");
    }
  });
});
