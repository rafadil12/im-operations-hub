import ExcelJS from "exceljs";
import type { SparepartItemInput } from "@/lib/types";

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 2000;

export type ImportRowError = {
  row: number;
  field?: string;
  message: string;
};

export type ParsedImportItem = SparepartItemInput;

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object" && value !== null && "text" in value) {
    return String((value as { text: unknown }).text ?? "").trim();
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    return String((value as { result: unknown }).result ?? "").trim();
  }
  return String(value).trim();
}

function normalizeHeader(value: unknown): string {
  return cellText(value).toLowerCase().replace(/\s+/g, " ");
}

function findCol(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (aliases.some((a) => h.includes(a))) return i;
  }
  return -1;
}

export async function parseSparepartItemsWorkbook(
  buffer: ArrayBuffer,
): Promise<
  | { ok: true; items: ParsedImportItem[] }
  | { ok: false; error: string; errors: ImportRowError[] }
> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    (Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)) as never,
  );

  const sheet =
    workbook.worksheets.find((ws) =>
      /item|stock|stok|备品|清单/i.test(ws.name),
    ) ?? workbook.worksheets[0];

  if (!sheet) {
    return {
      ok: false,
      error: "Workbook has no sheets.",
      errors: [],
    };
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = normalizeHeader(cell.value);
  });

  const codeCol = findCol(headers, ["kode", "code", "编码", "编号"]);
  const nameCol = findCol(headers, ["nama", "name", "名称", "品名"]);
  const brandCol = findCol(headers, ["brand", "品牌"]);
  const modelCol = findCol(headers, ["model", "型号"]);
  const notesCol = findCol(headers, ["notes", "keterangan", "备注"]);

  if (codeCol < 0 || nameCol < 0) {
    return {
      ok: false,
      error: "Header must include Code and Name.",
      errors: [],
    };
  }

  const items: ParsedImportItem[] = [];
  const errors: ImportRowError[] = [];
  const seen = new Set<string>();

  const lastRow = sheet.actualRowCount || sheet.rowCount;
  for (let r = 2; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    const code = cellText(row.getCell(codeCol + 1).value);
    const name = cellText(row.getCell(nameCol + 1).value);

    if (!code && !name) continue;

    if (!code) {
      errors.push({ row: r, field: "code", message: "Code is required." });
      continue;
    }
    if (!name) {
      errors.push({ row: r, field: "name", message: "Name is required." });
      continue;
    }
    if (seen.has(code.toUpperCase())) {
      errors.push({
        row: r,
        field: "code",
        message: `Duplicate code "${code}" in file.`,
      });
      continue;
    }
    seen.add(code.toUpperCase());

    items.push({
      code,
      name,
      brand: brandCol >= 0 ? cellText(row.getCell(brandCol + 1).value) : "",
      model: modelCol >= 0 ? cellText(row.getCell(modelCol + 1).value) : "",
      notes: notesCol >= 0 ? cellText(row.getCell(notesCol + 1).value) : "",
    });
  }

  if (items.length === 0 && errors.length === 0) {
    return {
      ok: false,
      error: "No data rows found.",
      errors: [],
    };
  }

  if (items.length > IMPORT_MAX_ROWS) {
    return {
      ok: false,
      error: `Too many rows. Maximum is ${IMPORT_MAX_ROWS}.`,
      errors: [],
    };
  }

  if (errors.length) {
    return {
      ok: false,
      error: "Import validation failed. No records were saved.",
      errors,
    };
  }

  return { ok: true, items };
}
