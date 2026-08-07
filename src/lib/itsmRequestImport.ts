import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

export const ITSM_IMPORT_MAX_BYTES = 10 * 1024 * 1024;
export const ITSM_IMPORT_MAX_ROWS = 20_000;
/** Scan this many leading rows for the ManageEngine-style header. */
const HEADER_SCAN_ROWS = 30;

export type ItsmImportRow = {
  request_id: number;
  subject: string;
  requester: string;
  technician: string;
  due_by_date: string | null;
  status: string;
  created_date: string;
  site: string | null;
  priority: string | null;
  group_name: string | null;
  is_service_request: boolean;
};

export type ItsmImportRowError = {
  row: number;
  field?: string;
  message: string;
};

export type ItsmImportParseResult =
  | { ok: true; rows: ItsmImportRow[]; headerRow: number }
  | { ok: false; errors: ItsmImportRowError[] };

type ItsmImportField = keyof ItsmImportRow;

const HEADER_ALIASES: Record<string, ItsmImportField> = {
  "request id": "request_id",
  request_id: "request_id",
  requestid: "request_id",
  subject: "subject",
  requester: "requester",
  technician: "technician",
  "dueby date": "due_by_date",
  "due by date": "due_by_date",
  "due date": "due_by_date",
  due_by_date: "due_by_date",
  status: "status",
  "created date": "created_date",
  created_date: "created_date",
  site: "site",
  priority: "priority",
  group: "group_name",
  "group name": "group_name",
  group_name: "group_name",
  "is service request": "is_service_request",
  "service request": "is_service_request",
  is_service_request: "is_service_request",
};

const REQUIRED_FIELDS: ItsmImportField[] = [
  "request_id",
  "subject",
  "requester",
  "technician",
  "status",
  "created_date",
];

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatAppDateTime(value);
  if (typeof value === "number" && Number.isFinite(value)) {
    // Likely an Excel serial if it looks like a date serial
    if (value > 20_000 && value < 100_000) {
      return formatAppDateTime(excelSerialToDate(value));
    }
    return String(value);
  }
  return String(value).trim();
}

function excelSerialToDate(serial: number): Date {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Match DB / list-query format: `DD/MM/YYYY hh:mm AM/PM`. */
function formatAppDateTime(date: Date): string {
  const day = pad2(date.getUTCDate());
  const month = pad2(date.getUTCMonth() + 1);
  const year = date.getUTCFullYear();
  let hours = date.getUTCHours();
  const minutes = pad2(date.getUTCMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${day}/${month}/${year} ${pad2(hours)}:${minutes} ${ampm}`;
}

function isBlankish(value: string): boolean {
  const s = value.trim();
  if (!s) return true;
  const lower = s.toLowerCase();
  return (
    s === "-" ||
    s === "—" ||
    s === "–" ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "null" ||
    lower === "none"
  );
}

function nullableText(value: unknown): string | null {
  const text = cellToString(value);
  return isBlankish(text) ? null : text;
}

function parseServiceRequest(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const s = cellToString(value).toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1";
}

function parseRequestId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  const text = cellToString(value).replace(/,/g, "");
  if (!text || isBlankish(text)) return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function findHeaderRow(
  matrix: unknown[][],
): { headerRowIndex: number; colMap: Partial<Record<ItsmImportField, number>> } | null {
  const limit = Math.min(HEADER_SCAN_ROWS, matrix.length);
  for (let r = 0; r < limit; r++) {
    const row = matrix[r] ?? [];
    const colMap: Partial<Record<ItsmImportField, number>> = {};
    for (let c = 0; c < row.length; c++) {
      const key = normalizeHeader(row[c]);
      if (!key) continue;
      const field = HEADER_ALIASES[key];
      if (field && colMap[field] === undefined) {
        colMap[field] = c;
      }
    }
    if (colMap.request_id !== undefined) {
      return { headerRowIndex: r, colMap };
    }
  }
  return null;
}

function getCell(row: unknown[], col: number | undefined): unknown {
  if (col === undefined) return null;
  return row[col];
}

/**
 * Parse a ManageEngine / ITSM Excel export.
 * Header row is detected dynamically (commonly row 7); data starts on the next row.
 */
export function parseItsmRequestWorkbook(
  buffer: ArrayBuffer | Buffer,
): ItsmImportParseResult {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      ok: false,
      errors: [{ row: 0, message: "Workbook has no sheets." }],
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  const found = findHeaderRow(matrix);
  if (!found) {
    return {
      ok: false,
      errors: [
        {
          row: 0,
          field: "Request ID",
          message:
            'Could not find a header row containing "Request ID". Export the ManageEngine report again or check the file.',
        },
      ],
    };
  }

  const missing = REQUIRED_FIELDS.filter((f) => found.colMap[f] === undefined);
  if (missing.length) {
    return {
      ok: false,
      errors: [
        {
          row: found.headerRowIndex + 1,
          message: `Missing required column(s): ${missing.join(", ")}.`,
        },
      ],
    };
  }

  const errors: ItsmImportRowError[] = [];
  const rows: ItsmImportRow[] = [];
  const seen = new Map<number, number>();

  for (let r = found.headerRowIndex + 1; r < matrix.length; r++) {
    const excelRow = r + 1;
    const raw = matrix[r] ?? [];
    const isEmpty = raw.every((cell) => cellToString(cell) === "");
    if (isEmpty) continue;

    const requestId = parseRequestId(getCell(raw, found.colMap.request_id));
    if (requestId === null) {
      errors.push({
        row: excelRow,
        field: "Request ID",
        message: "Request ID is required and must be a number.",
      });
      continue;
    }

    const prev = seen.get(requestId);
    if (prev !== undefined) {
      errors.push({
        row: excelRow,
        field: "Request ID",
        message: `Duplicate Request ID ${requestId} in file (also on row ${prev}).`,
      });
      continue;
    }
    seen.set(requestId, excelRow);

    const subject = cellToString(getCell(raw, found.colMap.subject));
    const requester = cellToString(getCell(raw, found.colMap.requester));
    const technician = cellToString(getCell(raw, found.colMap.technician));
    const status = cellToString(getCell(raw, found.colMap.status));
    const createdDate = cellToString(getCell(raw, found.colMap.created_date));

    if (!subject) {
      errors.push({
        row: excelRow,
        field: "Subject",
        message: "Subject is required.",
      });
      continue;
    }
    if (!createdDate || isBlankish(createdDate)) {
      errors.push({
        row: excelRow,
        field: "Created Date",
        message: "Created Date is required.",
      });
      continue;
    }

    rows.push({
      request_id: requestId,
      subject,
      requester,
      technician,
      due_by_date: nullableText(getCell(raw, found.colMap.due_by_date)),
      status,
      created_date: createdDate,
      site: nullableText(getCell(raw, found.colMap.site)),
      priority: nullableText(getCell(raw, found.colMap.priority)),
      group_name: nullableText(getCell(raw, found.colMap.group_name)),
      is_service_request: parseServiceRequest(
        getCell(raw, found.colMap.is_service_request),
      ),
    });
  }

  if (errors.length) {
    return { ok: false, errors: errors.slice(0, 50) };
  }

  if (!rows.length) {
    return {
      ok: false,
      errors: [
        {
          row: found.headerRowIndex + 1,
          message: "No data rows found under the header.",
        },
      ],
    };
  }

  return {
    ok: true,
    rows,
    headerRow: found.headerRowIndex + 1,
  };
}

/** ManageEngine-style blank template: metadata rows 1–6, headers on row 7. */
export async function buildItsmImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ManageEngine Report Framework");

  sheet.getCell("B1").value = "Company";
  sheet.getCell("B3").value = "Requests";
  sheet.getCell("B4").value = "Generated by : (upload ManageEngine export as-is)";
  sheet.getCell("B5").value = "Total records : 0";

  const headers = [
    "Request ID",
    "Subject",
    "Requester",
    "Technician",
    "DueBy Date",
    "Status",
    "Created Date",
    "Site",
    "Priority",
    "Group",
    "Is Service Request",
  ];

  headers.forEach((header, i) => {
    const cell = sheet.getCell(7, i + 2);
    cell.value = header;
    cell.font = { bold: true };
  });

  sheet.getCell(8, 2).value = 10001;
  sheet.getCell(8, 3).value = "Sample subject";
  sheet.getCell(8, 4).value = "Sample requester";
  sheet.getCell(8, 5).value = "Sample technician";
  sheet.getCell(8, 6).value = "-";
  sheet.getCell(8, 7).value = "Open";
  sheet.getCell(8, 8).value = "07/08/2026 02:00 PM";
  sheet.getCell(8, 9).value = "NUSA_SOLAR_INDONESIA";
  sheet.getCell(8, 10).value = "-";
  sheet.getCell(8, 11).value = "Indonesia-L1-Desktop-Group";
  sheet.getCell(8, 12).value = "false";

  sheet.getColumn(2).width = 14;
  sheet.getColumn(3).width = 40;
  sheet.getColumn(4).width = 22;
  sheet.getColumn(5).width = 22;
  sheet.getColumn(6).width = 20;
  sheet.getColumn(7).width = 16;
  sheet.getColumn(8).width = 22;
  sheet.getColumn(9).width = 24;
  sheet.getColumn(10).width = 12;
  sheet.getColumn(11).width = 32;
  sheet.getColumn(12).width = 18;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
