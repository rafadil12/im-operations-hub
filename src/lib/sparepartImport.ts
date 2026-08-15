import ExcelJS from "exceljs";
import { normalizeCategoryCode } from "@/lib/sparepartCategories";
import { DEFAULT_UOM_CODE, normalizeUomCode } from "@/lib/sparepartUoms";
import type { SparepartCategoryCode } from "@/lib/types";

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 2000;

export type ImportRowError = {
  row: number;
  field?: string;
  message: string;
};

export type ParsedImportItem = {
  row: number;
  code: string;
  name_en: string;
  name_cn: string;
  brand_en: string;
  brand_cn: string;
  model: string;
  notes: string;
  category_code: SparepartCategoryCode;
  uom_code: string;
  min_stock: number;
};

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

/** Prefer exact bilingual headers; avoid matching plain "name" when "name en" exists. */
function findNameEnCol(headers: string[]): number {
  const exact = findCol(headers, ["name en", "nama en"]);
  if (exact >= 0) return exact;
  const hasBilingual = headers.some(
    (h) => h.includes("name en") || h.includes("name cn"),
  );
  if (hasBilingual) return -1;
  return findCol(headers, ["nama", "name", "名称", "品名"]);
}

function findNameCnCol(headers: string[]): number {
  return findCol(headers, ["name cn", "nama cn", "中文名称", "中文"]);
}

function findBrandEnCol(headers: string[]): number {
  const exact = findCol(headers, ["brand en"]);
  if (exact >= 0) return exact;
  const hasBilingual = headers.some(
    (h) => h.includes("brand en") || h.includes("brand cn"),
  );
  if (hasBilingual) return -1;
  return findCol(headers, ["brand", "品牌"]);
}

function findBrandCnCol(headers: string[]): number {
  return findCol(headers, ["brand cn"]);
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
  const nameEnCol = findNameEnCol(headers);
  const nameCnCol = findNameCnCol(headers);
  const brandEnCol = findBrandEnCol(headers);
  const brandCnCol = findBrandCnCol(headers);
  const modelCol = findCol(headers, ["model", "型号"]);
  const notesCol = findCol(headers, ["notes", "keterangan", "备注"]);
  const categoryCol = findCol(headers, ["category", "kategori", "类别", "分类"]);
  const minStockCol = findCol(headers, [
    "min stock",
    "min_stock",
    "minimum stock",
    "safety stock",
    "最低库存",
    "安全库存",
  ]);
  const uomCol = findCol(headers, ["uom", "satuan"]);

  if (codeCol < 0) {
    return {
      ok: false,
      error: "Header must include Code.",
      errors: [],
    };
  }
  if (nameEnCol < 0) {
    return {
      ok: false,
      error: "Header must include Name EN.",
      errors: [],
    };
  }
  if (nameCnCol < 0) {
    return {
      ok: false,
      error: "Header must include Name CN.",
      errors: [],
    };
  }
  if (categoryCol < 0) {
    return {
      ok: false,
      error: "Header must include Category.",
      errors: [],
    };
  }
  if (minStockCol < 0) {
    return {
      ok: false,
      error: "Header must include Min Stock.",
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
    const name_en = cellText(row.getCell(nameEnCol + 1).value);
    const name_cn = cellText(row.getCell(nameCnCol + 1).value);

    if (!code && !name_en && !name_cn) continue;

    if (!code) {
      errors.push({ row: r, field: "code", message: "Code is required." });
      continue;
    }
    if (!name_en) {
      errors.push({
        row: r,
        field: "name_en",
        message: "Name EN is required.",
      });
      continue;
    }
    if (!name_cn) {
      errors.push({
        row: r,
        field: "name_cn",
        message: "Name CN is required.",
      });
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

    const rawCategory = cellText(row.getCell(categoryCol + 1).value);
    if (!rawCategory) {
      errors.push({
        row: r,
        field: "category",
        message: "Category is required.",
      });
      continue;
    }
    const parsedCategory = normalizeCategoryCode(rawCategory);
    if (!parsedCategory) {
      errors.push({
        row: r,
        field: "category",
        message: `Unknown category "${rawCategory}". Use IT, AGV, ASSEMBLY, or MES.`,
      });
      continue;
    }
    const category_code = parsedCategory;

    const rawMin = cellText(row.getCell(minStockCol + 1).value);
    if (!rawMin) {
      errors.push({
        row: r,
        field: "min_stock",
        message: "Min stock is required.",
      });
      continue;
    }
    const n = Number(rawMin);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      errors.push({
        row: r,
        field: "min_stock",
        message: "Min stock must be an integer of 0 or more.",
      });
      continue;
    }
    const min_stock = n;

    const rawUom =
      uomCol >= 0 ? cellText(row.getCell(uomCol + 1).value) : "";
    const uom_code = rawUom
      ? (normalizeUomCode(rawUom) ?? rawUom.toUpperCase())
      : DEFAULT_UOM_CODE;

    items.push({
      row: r,
      code,
      name_en,
      name_cn,
      brand_en:
        brandEnCol >= 0 ? cellText(row.getCell(brandEnCol + 1).value) : "",
      brand_cn:
        brandCnCol >= 0 ? cellText(row.getCell(brandCnCol + 1).value) : "",
      model: modelCol >= 0 ? cellText(row.getCell(modelCol + 1).value) : "",
      notes: notesCol >= 0 ? cellText(row.getCell(notesCol + 1).value) : "",
      category_code,
      uom_code,
      min_stock,
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
