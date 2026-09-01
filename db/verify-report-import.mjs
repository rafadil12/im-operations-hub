/**
 * Compare report_lines + report_sub_items against Data Modul Report.xlsx
 * Usage: node --env-file=.env.local db/verify-report-import.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
import mysql from "mysql2/promise";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SHEET_AREA = {
  MOM: "MES",
  "SMART LOGISTICS": "LOGISTICS",
  IT: "IT",
  SAFETY: "SAFETY",
};

const LOGISTICS_SUB_FALLBACK = { cn: "SOP整理", en: "SOP documentation" };

function cellText(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if (value.text) return String(value.text);
    if (value.result != null) return cellText(value.result);
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
  }
  return String(value).trim();
}

function parseWeekNumber(raw) {
  const m = cellText(raw).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function parseYear(raw) {
  const num = Number(cellText(raw));
  return Number.isInteger(num) && num >= 2000 ? num : null;
}

function parseRate(raw) {
  if (raw == null || raw === "") return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return Math.round(Math.max(0, Math.min(1, num)) * 10000) / 10000;
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(path.join(root, "Data Modul Report.xlsx"));

const excelRows = [];
for (const sheet of wb.worksheets) {
  const upper = sheet.name.toUpperCase();
  const sheetKey = upper.includes("MOM")
    ? "MOM"
    : upper.includes("LOGISTICS")
      ? "SMART LOGISTICS"
      : upper.includes("IT")
        ? "IT"
        : upper.includes("SAFETY")
          ? "SAFETY"
          : null;
  if (!sheetKey) continue;

  const areaCode = SHEET_AREA[sheetKey];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const year = parseYear(row.getCell(1).value);
    const week = parseWeekNumber(row.getCell(2).value);
    let subCn = cellText(row.getCell(6).value).trim();
    let subEn = cellText(row.getCell(7).value).trim();
    if (!subCn && areaCode === "LOGISTICS") {
      subCn = LOGISTICS_SUB_FALLBACK.cn;
      subEn = LOGISTICS_SUB_FALLBACK.en;
    }

    const targetCn = cellText(row.getCell(8).value).trim();
    if (!year || !week || !targetCn) return;

    excelRows.push({
      importKey: `${areaCode}-${year}-W${week}-R${rowNumber}`,
      areaCode,
      year,
      week,
      subCn,
      subEn: subEn || subCn,
      targetCn,
      targetEn: cellText(row.getCell(9).value).trim() || targetCn,
      rate: parseRate(row.getCell(10).value),
      summaryCn: cellText(row.getCell(11).value).trim(),
      summaryEn: cellText(row.getCell(12).value).trim() || cellText(row.getCell(11).value).trim(),
      planCn: cellText(row.getCell(13).value).trim() || null,
      planEn: cellText(row.getCell(14).value).trim() || cellText(row.getCell(13).value).trim() || null,
    });
  });
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
  dateStrings: true,
});

const [dbRows] = await conn.query(`
  SELECT rl.import_key, ra.code AS area_code, rw.year, rw.week_number AS week,
         si.name_cn AS sub_cn, si.name_en AS sub_en,
         rl.work_target_cn, rl.work_target_en, rl.weekly_completion_rate,
         rl.summary_cn, rl.summary_en, rl.plan_cn, rl.plan_en
  FROM report_lines rl
  JOIN report_weeks rw ON rw.id = rl.week_id
  JOIN report_areas ra ON ra.id = rl.area_id
  LEFT JOIN report_sub_items si ON si.id = rl.sub_item_id
  ORDER BY rl.sort_order
`);

await conn.end();

console.log(`Excel rows: ${excelRows.length}, DB rows: ${dbRows.length}`);

const dbByKey = new Map(dbRows.map((r) => [r.import_key, r]));
let mismatches = 0;

for (const ex of excelRows) {
  const db = dbByKey.get(ex.importKey);
  if (!db) {
    console.log("Missing in DB:", ex.importKey);
    mismatches += 1;
    continue;
  }

  const checks = [
    ["area", ex.areaCode, db.area_code],
    ["year", ex.year, db.year],
    ["week", ex.week, db.week],
    ["subCn", ex.subCn, db.sub_cn],
    ["subEn", ex.subEn, db.sub_en],
    ["targetCn", ex.targetCn, db.work_target_cn],
    ["targetEn", ex.targetEn, db.work_target_en],
    ["summaryCn", ex.summaryCn, db.summary_cn],
    ["summaryEn", ex.summaryEn, db.summary_en],
    ["planCn", ex.planCn ?? null, db.plan_cn],
    ["planEn", ex.planEn ?? null, db.plan_en],
  ];

  const rateDb =
    db.weekly_completion_rate == null ? null : Number(db.weekly_completion_rate);
  if (ex.rate !== rateDb && !(ex.rate == null && rateDb == null)) {
    console.log("Rate mismatch", ex.importKey, ex.rate, rateDb);
    mismatches += 1;
  }

  for (const [label, a, b] of checks) {
    const sa = a ?? "";
    const sb = b ?? "";
    if (sa !== sb) {
      console.log(`${label} mismatch`, ex.importKey, JSON.stringify(a), JSON.stringify(b));
      mismatches += 1;
    }
  }
}

const excelKeys = new Set(excelRows.map((r) => r.importKey));
for (const db of dbRows) {
  if (!excelKeys.has(db.import_key)) {
    console.log("Extra in DB:", db.import_key);
    mismatches += 1;
  }
}

if (mismatches === 0) {
  console.log("PASS: DB matches Excel exactly.");
} else {
  console.log(`FAIL: ${mismatches} mismatch(es).`);
  process.exit(1);
}
