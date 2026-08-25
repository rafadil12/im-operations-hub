import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseItsmRequestWorkbook } from "./requestImport";

async function workbookBuffer(rows: unknown[][]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  for (const row of rows) {
    ws.addRow(row);
  }
  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

describe("parseItsmRequestWorkbook status validation", () => {
  const header = [
    "Request ID",
    "Subject",
    "Requester",
    "Technician",
    "Status",
    "Created Date",
    "Is Service Request",
  ];

  it("rejects rows with empty Status", async () => {
    const buffer = await workbookBuffer([
      header,
      [1001, "Broken printer", "Alice", "Bob", "", "08/08/2026 09:15 AM", "false"],
    ]);
    const result = await parseItsmRequestWorkbook(buffer);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "Status")).toBe(true);
    }
  });

  it("accepts a minimal valid row", async () => {
    const buffer = await workbookBuffer([
      header,
      [1002, "Need access", "Alice", "Bob", "Open", "08/08/2026 09:15 AM", "true"],
    ]);
    const result = await parseItsmRequestWorkbook(buffer);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.status).toBe("Open");
      expect(result.rows[0]?.is_service_request).toBe(true);
    }
  });
});
