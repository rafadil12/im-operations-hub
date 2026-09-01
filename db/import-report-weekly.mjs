/**
 * Import weekly report lines from Data Modul Report.xlsx
 * Sheets: MOM, SMART LOGISTICS, IT, SAFETY
 *
 * Week calendar: Saturday (day 1) through Friday (day 7); due Friday.
 * Logistics rows with empty sub-item default to SOP整理 / SOP documentation.
 * Sub-items are upserted into report_sub_items from Excel (source of truth).
 *
 * Usage:
 *   node --env-file=.env.local db/import-report-weekly.mjs
 *   node --env-file=.env.local db/import-report-weekly.mjs --force
 */
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const force = process.argv.includes("--force");

const SHEET_AREA = {
  MOM: "MES",
  "SMART LOGISTICS": "LOGISTICS",
  IT: "IT",
  SAFETY: "SAFETY",
};

const LOGISTICS_SUB_FALLBACK = {
  cn: "SOP整理",
  en: "SOP documentation",
};

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
  const text = cellText(raw).trim();
  const m = text.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function parseYear(raw) {
  const num = Number(cellText(raw));
  return Number.isInteger(num) && num >= 2000 && num <= 2100 ? num : null;
}

function parseRate(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return Math.round(num * 10000) / 10000;
}

/** Week 1 anchor: first Saturday on or before Jan 1. Sat=day1 … Fri=day7. */
function getYearAnchorSaturday(year) {
  const jan1 = new Date(year, 0, 1);
  const dow = (jan1.getDay() + 1) % 7;
  const sat = new Date(jan1);
  sat.setDate(sat.getDate() - dow);
  return sat;
}

function getSaturdayForWeek(year, weekNumber) {
  const anchor = getYearAnchorSaturday(year);
  const sat = new Date(anchor);
  sat.setDate(sat.getDate() + (weekNumber - 1) * 7);
  return sat;
}

async function ensureWeek(conn, year, weekNumber, weeksCache) {
  const key = `${year}-${weekNumber}`;
  if (weeksCache.has(key)) return weeksCache.get(key);

  const [existing] = await conn.query(
    `SELECT id FROM report_weeks WHERE year = ? AND week_number = ? LIMIT 1`,
    [year, weekNumber]
  );
  if (existing[0]) {
    weeksCache.set(key, existing[0].id);
    return existing[0].id;
  }

  const saturday = getSaturdayForWeek(year, weekNumber);
  const friday = new Date(saturday);
  friday.setDate(friday.getDate() + 6);
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const [result] = await conn.query(
    `INSERT INTO report_weeks (year, week_number, label, starts_on, ends_on, report_due_on)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [year, weekNumber, `${weekNumber}周`, fmt(saturday), fmt(friday), fmt(friday)]
  );
  weeksCache.set(key, result.insertId);
  return result.insertId;
}

function parseSheetRows(sheet, areaCode) {
  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const year = parseYear(row.getCell(1).value);
    const weekNumber = parseWeekNumber(row.getCell(2).value);
    let subCn = cellText(row.getCell(6).value).trim();
    let subEn = cellText(row.getCell(7).value).trim();

    if (!subCn && areaCode === "LOGISTICS") {
      subCn = LOGISTICS_SUB_FALLBACK.cn;
      subEn = LOGISTICS_SUB_FALLBACK.en;
    }

    const targetCn = cellText(row.getCell(8).value).trim();
    const targetEn = cellText(row.getCell(9).value).trim();
    const rate = parseRate(row.getCell(10).value);
    const summaryCn = cellText(row.getCell(11).value).trim();
    const summaryEn = cellText(row.getCell(12).value).trim();
    const planCn = cellText(row.getCell(13).value).trim();
    const planEn = cellText(row.getCell(14).value).trim();

    if (!year || !weekNumber || !targetCn) return;

    rows.push({
      excelRow: rowNumber,
      year,
      weekNumber,
      subCn,
      subEn: subEn || subCn,
      targetCn,
      targetEn: targetEn || targetCn,
      rate,
      summaryCn,
      summaryEn: summaryEn || summaryCn,
      planCn: planCn || null,
      planEn: planEn || planCn || null,
    });
  });
  return rows;
}

function subItemKey(areaId, nameCn) {
  return `${areaId}::${nameCn}`;
}

async function upsertSubItems(conn, allParsed) {
  const seen = new Map();
  let sortOrder = 0;

  for (const row of allParsed) {
    if (!row.subCn) continue;
    const key = subItemKey(row.areaId, row.subCn);
    if (seen.has(key)) continue;
    seen.set(key, {
      areaId: row.areaId,
      nameCn: row.subCn,
      nameEn: row.subEn,
      sortOrder: sortOrder++,
    });
  }

  const idByKey = new Map();
  for (const item of seen.values()) {
    await conn.query(
      `INSERT INTO report_sub_items (area_id, name_en, name_cn, sort_order)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name_en = VALUES(name_en),
         sort_order = VALUES(sort_order)`,
      [item.areaId, item.nameEn, item.nameCn, item.sortOrder]
    );
  }

  const [subItems] = await conn.query(
    `SELECT id, area_id, name_cn FROM report_sub_items`
  );
  for (const si of subItems) {
    idByKey.set(subItemKey(si.area_id, si.name_cn), si.id);
  }
  return idByKey;
}

async function main() {
  const excelPath = path.join(root, "Data Modul Report.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) throw new Error("Missing DB env vars.");

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    charset: "utf8mb4",
    dateStrings: true,
  });

  try {
    const [[{ count }]] = await conn.query("SELECT COUNT(*) AS count FROM report_lines");
    if (Number(count) > 0 && !force) {
      console.log(`report_lines has ${count} rows. Use --force to truncate and re-import.`);
      return;
    }

    if (force) {
      await conn.query("SET FOREIGN_KEY_CHECKS = 0");
      await conn.query("TRUNCATE TABLE report_lines");
      await conn.query("TRUNCATE TABLE report_week_submissions");
      await conn.query("TRUNCATE TABLE report_weeks");
      await conn.query("TRUNCATE TABLE report_sub_items");
      await conn.query("SET FOREIGN_KEY_CHECKS = 1");
      console.log(
        "Truncated report_lines, report_week_submissions, report_weeks, report_sub_items."
      );
    }

    const [areas] = await conn.query(`SELECT id, code FROM report_areas`);
    const areaByCode = new Map(areas.map((a) => [a.code, a.id]));

    const allParsed = [];
    const sheetCounts = {};

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
      const areaId = areaByCode.get(areaCode);
      if (!areaId) {
        console.warn(`Skip sheet ${sheet.name}: area ${areaCode} not found`);
        continue;
      }

      const parsed = parseSheetRows(sheet, areaCode).map((r) => ({
        ...r,
        areaId,
        areaCode,
        sheetName: sheet.name,
      }));
      allParsed.push(...parsed);
      sheetCounts[sheet.name] = parsed.length;
      console.log(`Parsed ${parsed.length} rows from ${sheet.name} → ${areaCode}`);
    }

    const subItemIds = await upsertSubItems(conn, allParsed);
    console.log(`Upserted ${subItemIds.size} sub-item(s) from Excel.`);

    const weeksCache = new Map();
    let inserted = 0;

    for (const row of allParsed) {
      const weekId = await ensureWeek(conn, row.year, row.weekNumber, weeksCache);
      const subItemId = row.subCn ? subItemIds.get(subItemKey(row.areaId, row.subCn)) ?? null : null;
      const importKey = `${row.areaCode}-${row.year}-W${row.weekNumber}-R${row.excelRow}`;
      const sortOrder = inserted;

      await conn.query(
        `INSERT INTO report_lines (
           week_id, area_id, sub_item_id,
           work_target_en, work_target_cn, weekly_completion_rate,
           summary_en, summary_cn, plan_en, plan_cn,
           import_key, sort_order
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           sub_item_id = VALUES(sub_item_id),
           work_target_en = VALUES(work_target_en),
           work_target_cn = VALUES(work_target_cn),
           weekly_completion_rate = VALUES(weekly_completion_rate),
           summary_en = VALUES(summary_en),
           summary_cn = VALUES(summary_cn),
           plan_en = VALUES(plan_en),
           plan_cn = VALUES(plan_cn),
           sort_order = VALUES(sort_order)`,
        [
          weekId,
          row.areaId,
          subItemId,
          row.targetEn,
          row.targetCn,
          row.rate,
          row.summaryEn,
          row.summaryCn,
          row.planEn,
          row.planCn,
          importKey,
          sortOrder,
        ]
      );
      inserted += 1;
    }

    await conn.query(
      `INSERT INTO report_week_submissions (week_id, area_id, status, submitted_at)
       SELECT DISTINCT rl.week_id, rl.area_id, 'submitted', NOW()
       FROM report_lines rl
       ON DUPLICATE KEY UPDATE status = 'submitted', submitted_at = COALESCE(submitted_at, NOW())`
    );

    const [[{ lineCount }]] = await conn.query("SELECT COUNT(*) AS lineCount FROM report_lines");
    const [[{ subCount }]] = await conn.query("SELECT COUNT(*) AS subCount FROM report_sub_items");

    console.log(
      `Import complete: ${inserted} lines (${lineCount} in DB), ${subCount} sub-items, ${weeksCache.size} week(s).`
    );
    console.log("Sheet row counts:", sheetCounts);
    if (Number(lineCount) !== inserted) {
      console.warn(`Warning: expected ${inserted} lines but DB has ${lineCount}.`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
