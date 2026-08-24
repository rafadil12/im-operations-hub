import ExcelJS from "exceljs";
import {
  categoriesForDivision,
  subcategoriesForCategory,
  usersForDivision,
} from "@/lib/cascade";
import {
  validateMesRecord,
  type MesValidationErrorKey,
} from "@/lib/mesRecordValidation";
import type { Masters, MesDataInput, MesDataRow } from "@/lib/types";

export const IMPORT_MAX_ROWS = 500;
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;

export const ACTIVITY_HEADERS = [
  "PIC",
  "Division",
  "Category",
  "Subcategory",
  "Description CN",
  "Description EN",
  "Solution CN",
  "Solution EN",
  "Type",
  "Status",
  "Start Time",
  "End Time",
] as const;

type ActivityHeader = (typeof ACTIVITY_HEADERS)[number];

export type ImportRowError = {
  row: number;
  field?: string;
  message: string;
};

export type ImportParseResult =
  | { ok: true; rows: MesDataInput[] }
  | { ok: false; errors: ImportRowError[] };

const VALIDATION_MESSAGES: Record<MesValidationErrorKey, string> = {
  required: "This field is required.",
  startBeforeEnd: "Start time must be before end time.",
  enHasChinese: "English fields must not contain Chinese characters.",
  cnNeedsChinese: "Chinese fields must include Chinese characters.",
  invalidDateTime: "Please enter a valid date and time.",
};

const HEADER_ALIASES: Record<string, ActivityHeader> = {
  pic: "PIC",
  division: "Division",
  category: "Category",
  subcategory: "Subcategory",
  "description cn": "Description CN",
  "description (cn)": "Description CN",
  description_cn: "Description CN",
  "description en": "Description EN",
  "description (en)": "Description EN",
  description_en: "Description EN",
  "solution cn": "Solution CN",
  "solution (cn)": "Solution CN",
  solution_cn: "Solution CN",
  "solution en": "Solution EN",
  "solution (en)": "Solution EN",
  solution_en: "Solution EN",
  type: "Type",
  status: "Status",
  "start time": "Start Time",
  start_time: "Start Time",
  "end time": "End Time",
  end_time: "End Time",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Excel wall-clock datetime as UTC components (ExcelJS Date / serial). */
function excelDateToWallClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    // ExcelJS maps Excel datetimes to UTC wall clock — do not use local getters
    // or WIB (+7) shifts 08:10 → 15:10 on import.
    return excelDateToWallClock(value);
  }
  if (typeof value === "object" && value !== null && "text" in value) {
    return String((value as { text: unknown }).text ?? "").trim();
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    return cellToString((value as { result: unknown }).result);
  }
  return String(value).trim();
}

function excelSerialToDateTime(serial: number): string {
  // Excel serial date (days since 1899-12-30), wall clock via UTC
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return excelDateToWallClock(new Date(ms));
}

function normalizeDateTimeCell(value: unknown): string {
  if (value instanceof Date) return excelDateToWallClock(value);
  if (typeof value === "number" && Number.isFinite(value)) {
    return excelSerialToDateTime(value);
  }
  const text = cellToString(value);
  if (!text) return "";
  // datetime-local style from Excel text
  return text.replace("T", " ").replace(/\.\d+$/, "").slice(0, 16);
}

type Named = { id: number; name_en: string | null; name_cn: string | null };

function findByName<T extends Named>(
  items: T[],
  name: string,
): T | undefined {
  const key = name.trim().toLowerCase();
  if (!key) return undefined;
  return items.find(
    (item) =>
      item.name_en?.trim().toLowerCase() === key ||
      item.name_cn?.trim().toLowerCase() === key,
  );
}

function displayName(item: Named): string {
  return item.name_en?.trim() || item.name_cn?.trim() || String(item.id);
}

export async function buildActivitiesTemplate(
  masters: Masters,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IM Operations Hub";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Activities");
  sheet.columns = ACTIVITY_HEADERS.map((header) => ({
    header,
    key: header,
    width: Math.max(14, header.length + 2),
  }));
  sheet.getRow(1).font = { bold: true };
  // One empty data row for guidance
  sheet.addRow(ACTIVITY_HEADERS.map(() => ""));

  const note = workbook.addWorksheet("Reference");
  note.getCell("A1").value =
    "Valid master values (use EN or CN names exactly as listed). Cascade rules: Category must belong to Division; Subcategory to Category; PIC to Division.";
  note.getCell("A1").font = { bold: true };
  note.mergeCells("A1:F1");

  const refHeaders = [
    "Division",
    "Category (Division)",
    "Subcategory (Category)",
    "PIC (Division)",
    "Type",
    "Status",
  ] as const;
  note.addRow([]);
  note.addRow([...refHeaders]);
  note.getRow(3).font = { bold: true };

  const maxLen = Math.max(
    masters.divisions.length,
    masters.categories.length,
    masters.subcategories.length,
    masters.users.length,
    masters.types.length,
    masters.statuses.length,
    1,
  );

  const divisionById = new Map(
    masters.divisions.map((d) => [d.id, displayName(d)]),
  );
  const categoryById = new Map(
    masters.categories.map((c) => [c.id, displayName(c)]),
  );

  for (let i = 0; i < maxLen; i++) {
    const division = masters.divisions[i];
    const category = masters.categories[i];
    const subcategory = masters.subcategories[i];
    const user = masters.users[i];
    const type = masters.types[i];
    const status = masters.statuses[i];

    note.addRow([
      division ? displayName(division) : "",
      category
        ? `${displayName(category)}${
            category.division_id
              ? ` (${divisionById.get(category.division_id) ?? category.division_id})`
              : ""
          }`
        : "",
      subcategory
        ? `${displayName(subcategory)}${
            subcategory.category_id
              ? ` (${categoryById.get(subcategory.category_id) ?? subcategory.category_id})`
              : ""
          }`
        : "",
      user
        ? `${displayName(user)}${
            user.division_id
              ? ` (${divisionById.get(user.division_id) ?? user.division_id})`
              : ""
          }`
        : "",
      type ? displayName(type) : "",
      status ? displayName(status) : "",
    ]);
  }

  note.columns = refHeaders.map((h) => ({
    header: h,
    width: Math.max(22, h.length + 2),
  }));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function formatExportDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim().replace("T", " ");
  // YYYY-MM-DD HH:mm(:ss) → YYYY-MM-DD HH:mm
  return trimmed.length >= 16 ? trimmed.slice(0, 16) : trimmed;
}

function exportMasterName(
  nameEn: string | null | undefined,
  nameCn: string | null | undefined,
): string {
  return nameEn?.trim() || nameCn?.trim() || "";
}

/** Build an Activities workbook from filtered rows (same columns as template/import). */
export async function buildActivitiesExport(
  rows: MesDataRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IM Operations Hub";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Activities");
  sheet.columns = ACTIVITY_HEADERS.map((header) => ({
    header,
    key: header,
    width: Math.max(14, header.length + 2),
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow([
      exportMasterName(row.pic_en, row.pic_cn),
      exportMasterName(row.division_en, row.division_cn),
      exportMasterName(row.category_en, row.category_cn),
      exportMasterName(row.subcategory_en, row.subcategory_cn),
      row.description_cn ?? "",
      row.description_en ?? "",
      row.solution_cn ?? "",
      row.solution_en ?? "",
      exportMasterName(row.type_en, row.type_cn),
      exportMasterName(row.status_en, row.status_cn),
      formatExportDateTime(row.start_time),
      formatExportDateTime(row.end_time),
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function mapHeaderRow(
  values: unknown[],
): { ok: true; map: Partial<Record<ActivityHeader, number>> } | { ok: false; message: string } {
  const map: Partial<Record<ActivityHeader, number>> = {};
  for (let i = 0; i < values.length; i++) {
    const raw = normalizeHeader(values[i]);
    if (!raw) continue;
    const canonical = HEADER_ALIASES[raw];
    if (!canonical) continue;
    map[canonical] = i;
  }

  const missing = ACTIVITY_HEADERS.filter((h) => map[h] === undefined);
  if (missing.length) {
    return {
      ok: false,
      message: `Missing required columns: ${missing.join(", ")}`,
    };
  }
  return { ok: true, map };
}

function getCell(
  values: unknown[],
  map: Partial<Record<ActivityHeader, number>>,
  header: ActivityHeader,
): unknown {
  const idx = map[header];
  if (idx === undefined) return "";
  return values[idx];
}

function isEmptyRow(values: unknown[]): boolean {
  return values.every((v) => cellToString(v) === "");
}

export async function parseActivitiesWorkbook(
  buffer: ArrayBuffer | Buffer,
  masters: Masters,
): Promise<ImportParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    (Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)) as never,
  );

  const sheet =
    workbook.getWorksheet("Activities") ?? workbook.worksheets[0] ?? null;
  if (!sheet) {
    return {
      ok: false,
      errors: [{ row: 0, message: "Workbook has no worksheets." }],
    };
  }

  const headerRow = sheet.getRow(1);
  const headerValues: unknown[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headerValues[colNumber - 1] = cell.value;
  });

  const mapped = mapHeaderRow(headerValues);
  if (!mapped.ok) {
    return {
      ok: false,
      errors: [{ row: 1, message: mapped.message }],
    };
  }

  const errors: ImportRowError[] = [];
  const rows: MesDataInput[] = [];

  const rowCount = sheet.rowCount;
  for (let r = 2; r <= rowCount; r++) {
    const excelRow = sheet.getRow(r);
    const values: unknown[] = [];
    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      values[colNumber - 1] = cell.value;
    });

    // Ensure array length covers mapped columns
    const maxIdx = Math.max(
      ...ACTIVITY_HEADERS.map((h) => mapped.map[h] ?? 0),
      0,
    );
    while (values.length <= maxIdx) values.push("");

    if (isEmptyRow(values)) continue;

    const picName = cellToString(getCell(values, mapped.map, "PIC"));
    const divisionName = cellToString(
      getCell(values, mapped.map, "Division"),
    );
    const categoryName = cellToString(
      getCell(values, mapped.map, "Category"),
    );
    const subcategoryName = cellToString(
      getCell(values, mapped.map, "Subcategory"),
    );
    const descriptionCn = cellToString(
      getCell(values, mapped.map, "Description CN"),
    );
    const descriptionEn = cellToString(
      getCell(values, mapped.map, "Description EN"),
    );
    const solutionCn = cellToString(
      getCell(values, mapped.map, "Solution CN"),
    );
    const solutionEn = cellToString(
      getCell(values, mapped.map, "Solution EN"),
    );
    const typeName = cellToString(getCell(values, mapped.map, "Type"));
    const statusName = cellToString(getCell(values, mapped.map, "Status"));
    const startTime = normalizeDateTimeCell(
      getCell(values, mapped.map, "Start Time"),
    );
    const endTime = normalizeDateTimeCell(
      getCell(values, mapped.map, "End Time"),
    );

    let divisionId: number | null = null;
    let userId: number | null = null;
    let categoryId: number | null = null;
    let subcategoryId: number | null = null;
    let typeId: number | null = null;
    let statusId: number | null = null;

    const division = findByName(masters.divisions, divisionName);
    if (!divisionName) {
      errors.push({
        row: r,
        field: "Division",
        message: "Division is required.",
      });
    } else if (!division) {
      errors.push({
        row: r,
        field: "Division",
        message: `Unknown Division "${divisionName}".`,
      });
    } else {
      divisionId = division.id;
    }

    if (divisionId !== null) {
      const picPool = usersForDivision(masters, divisionId);
      const pic = findByName(picPool, picName);
      if (!picName) {
        errors.push({ row: r, field: "PIC", message: "PIC is required." });
      } else if (!pic) {
        const anyPic = findByName(masters.users, picName);
        errors.push({
          row: r,
          field: "PIC",
          message: anyPic
            ? `PIC "${picName}" does not belong to Division "${divisionName}".`
            : `Unknown PIC "${picName}".`,
        });
      } else {
        userId = pic.id;
      }

      const categoryPool = categoriesForDivision(masters, divisionId);
      const category = findByName(categoryPool, categoryName);
      if (!categoryName) {
        errors.push({
          row: r,
          field: "Category",
          message: "Category is required.",
        });
      } else if (!category) {
        const anyCat = findByName(masters.categories, categoryName);
        errors.push({
          row: r,
          field: "Category",
          message: anyCat
            ? `Category "${categoryName}" does not belong to Division "${divisionName}".`
            : `Unknown Category "${categoryName}".`,
        });
      } else {
        categoryId = category.id;
      }
    } else if (picName || categoryName) {
      // Still report missing when division failed
      if (!picName) {
        errors.push({ row: r, field: "PIC", message: "PIC is required." });
      } else if (!findByName(masters.users, picName)) {
        errors.push({
          row: r,
          field: "PIC",
          message: `Unknown PIC "${picName}".`,
        });
      }
      if (!categoryName) {
        errors.push({
          row: r,
          field: "Category",
          message: "Category is required.",
        });
      } else if (!findByName(masters.categories, categoryName)) {
        errors.push({
          row: r,
          field: "Category",
          message: `Unknown Category "${categoryName}".`,
        });
      }
    }

    if (categoryId !== null) {
      const subPool = subcategoriesForCategory(masters, categoryId);
      const subcategory = findByName(subPool, subcategoryName);
      if (!subcategoryName) {
        errors.push({
          row: r,
          field: "Subcategory",
          message: "Subcategory is required.",
        });
      } else if (!subcategory) {
        const anySub = findByName(masters.subcategories, subcategoryName);
        errors.push({
          row: r,
          field: "Subcategory",
          message: anySub
            ? `Subcategory "${subcategoryName}" does not belong to Category "${categoryName}".`
            : `Unknown Subcategory "${subcategoryName}".`,
        });
      } else {
        subcategoryId = subcategory.id;
      }
    } else if (subcategoryName) {
      if (!findByName(masters.subcategories, subcategoryName)) {
        errors.push({
          row: r,
          field: "Subcategory",
          message: `Unknown Subcategory "${subcategoryName}".`,
        });
      } else {
        errors.push({
          row: r,
          field: "Subcategory",
          message: `Cannot resolve Subcategory without a valid Category.`,
        });
      }
    } else {
      errors.push({
        row: r,
        field: "Subcategory",
        message: "Subcategory is required.",
      });
    }

    const type = findByName(masters.types, typeName);
    if (!typeName) {
      errors.push({ row: r, field: "Type", message: "Type is required." });
    } else if (!type) {
      errors.push({
        row: r,
        field: "Type",
        message: `Unknown Type "${typeName}".`,
      });
    } else {
      typeId = type.id;
    }

    const status = findByName(masters.statuses, statusName);
    if (!statusName) {
      errors.push({ row: r, field: "Status", message: "Status is required." });
    } else if (!status) {
      errors.push({
        row: r,
        field: "Status",
        message: `Unknown Status "${statusName}".`,
      });
    } else {
      statusId = status.id;
    }

    const validated = validateMesRecord({
      user_id: userId,
      division_id: divisionId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      type_id: typeId,
      status_id: statusId,
      description_cn: descriptionCn,
      description_en: descriptionEn,
      solution_cn: solutionCn,
      solution_en: solutionEn,
      start_time: startTime,
      end_time: endTime,
    });

    if (!validated.ok) {
      for (const err of validated.errors) {
        // Skip ID required errors when we already reported name resolution issues
        if (
          err.key === "required" &&
          (err.field === "user_id" ||
            err.field === "division_id" ||
            err.field === "category_id" ||
            err.field === "subcategory_id" ||
            err.field === "type_id" ||
            err.field === "status_id")
        ) {
          continue;
        }
        errors.push({
          row: r,
          field: err.field,
          message: VALIDATION_MESSAGES[err.key],
        });
      }
      continue;
    }

    rows.push(validated.data);
  }

  if (rows.length === 0 && errors.length === 0) {
    return {
      ok: false,
      errors: [{ row: 0, message: "No data rows found in the file." }],
    };
  }

  if (rows.length > IMPORT_MAX_ROWS) {
    return {
      ok: false,
      errors: [
        {
          row: 0,
          message: `Too many rows. Maximum is ${IMPORT_MAX_ROWS}.`,
        },
      ],
    };
  }

  // All-or-nothing: if any row had errors, reject entire import
  // Also collect rows that failed name resolution without reaching validate
  const dataRowCount = rows.length + new Set(errors.map((e) => e.row)).size;
  if (dataRowCount > IMPORT_MAX_ROWS) {
    return {
      ok: false,
      errors: [
        {
          row: 0,
          message: `Too many rows. Maximum is ${IMPORT_MAX_ROWS}.`,
        },
      ],
    };
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, rows };
}
