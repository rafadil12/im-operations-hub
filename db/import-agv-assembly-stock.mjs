// One-shot: upsert AGV/ASSEMBLY material master from
// `AGV & ASSEMBLY STOCK DATA.xlsx`, then post opening stock as 101
// (does not wipe IT ledger).
//
// Usage:
//   node --env-file=.env.local db/import-agv-assembly-stock.mjs
//
// Idempotent via client_request_id = OPENING-{code}.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const WORKBOOK = join(root, "AGV & ASSEMBLY STOCK DATA.xlsx");

const LOCATION_SEEDS = [
  ["AGV-RACK", "AGV RACK"],
  ["ASM-RACK-A", "ASSEMBLY RACK A"],
  ["ASM-RACK-B", "ASSEMBLY RACK B"],
  ["ASM-RACK-C", "ASSEMBLY RACK C"],
  ["ASM-RACK-D", "ASSEMBLY RACK D"],
  ["ASM-RACK-E", "ASSEMBLY RACK E"],
  ["ASM-RACK-F", "ASSEMBLY RACK F"],
];

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: false,
});

function cellText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object" && value !== null && "richText" in value) {
    return value.richText.map((t) => t.text ?? "").join("").trim();
  }
  if (typeof value === "object" && value !== null && "text" in value) {
    return String(value.text ?? "").trim();
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    return String(value.result ?? "").trim();
  }
  return String(value).trim();
}

function emptyDash(value) {
  const text = cellText(value);
  return !text || text === "-" ? "" : text;
}

function toInt(value) {
  const n = Number(cellText(value));
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function normalizeUom(value) {
  const code = cellText(value).toUpperCase();
  if (!code) return "PCS";
  if (code === "PC" || code === "PCS" || code === "PIECE" || code === "PIECES") {
    return "PCS";
  }
  if (code === "PK" || code === "PACK" || code === "PACKET") return "PACK";
  if (code === "ROLL" || code === "ROL") return "ROLL";
  if (code === "M" || code === "MTR" || code === "METER" || code === "METRE") {
    return "MTR";
  }
  return code;
}

function normalizeCategory(value) {
  const code = cellText(value).toUpperCase();
  if (code === "ASSEMBLY" || code === "ASM") return "ASSEMBLY";
  if (code === "AGV" || code === "IT" || code === "MES") return code;
  return null;
}

function todayStamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day} 00:00:00`;
}

function slugLocationCode(name) {
  const slug = String(name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return slug || "LOC";
}

async function loadSuperAdmin() {
  const [rows] = await conn.query(
    `SELECT su.id AS system_user_id, u.name_en, u.name_cn, u.employee_no
     FROM system_users su
     JOIN users u ON u.id = su.user_id
     WHERE u.employee_no = 'SUPERADMIN'
     LIMIT 1`,
  );
  if (!rows[0]) {
    throw new Error(
      "Super Admin account not found. Run: node --env-file=.env.local db/run-migrations.mjs",
    );
  }
  return {
    systemUserId: Number(rows[0].system_user_id),
    label: rows[0].name_en || rows[0].name_cn || "Super Admin",
  };
}

async function nextDocNumber(postingDate) {
  const ymd = postingDate.slice(0, 10).replaceAll("-", "");
  const prefix = `MD${ymd}`;
  const [rows] = await conn.query(
    `SELECT doc_number FROM sparepart_mat_docs
     WHERE doc_number LIKE ?
     ORDER BY doc_number DESC
     LIMIT 1
     FOR UPDATE`,
    [`${prefix}%`],
  );
  let seq = 1;
  const last = rows[0]?.doc_number;
  if (last && last.length >= prefix.length + 4) {
    const n = Number(last.slice(prefix.length));
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function adjustBalance(itemId, locationId, delta) {
  const [rows] = await conn.query(
    `SELECT id, qty FROM sparepart_stock_balances
     WHERE item_id = ? AND storage_location_id = ?
     LIMIT 1
     FOR UPDATE`,
    [itemId, locationId],
  );
  if (!rows[0]) {
    if (delta === 0) return 0;
    await conn.query(
      `INSERT INTO sparepart_stock_balances (item_id, storage_location_id, qty)
       VALUES (?, ?, ?)`,
      [itemId, locationId, delta],
    );
    return delta;
  }
  const next = Number(rows[0].qty) + delta;
  if (next === 0) {
    await conn.query(`DELETE FROM sparepart_stock_balances WHERE id = ?`, [
      rows[0].id,
    ]);
    return 0;
  }
  await conn.query(`UPDATE sparepart_stock_balances SET qty = ? WHERE id = ?`, [
    next,
    rows[0].id,
  ]);
  return next;
}

async function syncStockCurrent(itemId) {
  await conn.query(
    `UPDATE sparepart_items i
     SET stock_current = (
       SELECT COALESCE(SUM(b.qty), 0)
       FROM sparepart_stock_balances b
       WHERE b.item_id = i.id
     )
     WHERE i.id = ?`,
    [itemId],
  );
}

async function ensureLocation(name) {
  const preferred = cellText(name);
  const [byName] = await conn.query(
    `SELECT id, code, name FROM sparepart_storage_locations
     WHERE LOWER(name) = LOWER(?)
     LIMIT 1`,
    [preferred],
  );
  if (byName[0]) return byName[0];

  const seed = LOCATION_SEEDS.find(
    ([, seedName]) => seedName.toLowerCase() === preferred.toLowerCase(),
  );
  const code = seed?.[0] ?? slugLocationCode(preferred);
  const [byCode] = await conn.query(
    `SELECT id, code, name FROM sparepart_storage_locations
     WHERE code = ? LIMIT 1`,
    [code],
  );
  if (byCode[0]) return byCode[0];

  const [ins] = await conn.query(
    `INSERT INTO sparepart_storage_locations (code, name, is_active)
     VALUES (?, ?, 1)`,
    [code, preferred],
  );
  return { id: ins.insertId, code, name: preferred };
}

console.log(`Loading ${WORKBOOK}…`);
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(WORKBOOK);
const sheet =
  wb.worksheets.find((ws) => /item/i.test(ws.name)) ?? wb.worksheets[0];
if (!sheet) {
  console.error("Workbook has no sheets.");
  process.exit(1);
}

const headerRow = sheet.getRow(1);
const headers = [];
headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
  headers[col - 1] = cellText(cell.value).toLowerCase().replace(/\s+/g, " ");
});

function findCol(aliases) {
  for (let i = 0; i < headers.length; i++) {
    if (aliases.some((a) => (headers[i] ?? "").includes(a))) return i;
  }
  return -1;
}

const cols = {
  code: findCol(["code"]),
  nameEn: findCol(["name en"]),
  nameCn: findCol(["name cn"]),
  brandEn: findCol(["brand en"]),
  brandCn: findCol(["brand cn"]),
  model: findCol(["model"]),
  category: findCol(["category"]),
  minStock: findCol(["min stock"]),
  notes: findCol(["notes"]),
  stock: findCol(["stock current"]),
  uom: findCol(["uom"]),
  location: findCol(["lokasi", "location"]),
};

if (cols.code < 0 || cols.nameEn < 0 || cols.nameCn < 0 || cols.category < 0 || cols.minStock < 0) {
  console.error("Missing required headers: Code, Name EN, Name CN, Category, Min Stock.");
  process.exit(1);
}

const excelRows = [];
const last = sheet.actualRowCount || sheet.rowCount;
for (let r = 2; r <= last; r++) {
  const row = sheet.getRow(r);
  const code = cellText(row.getCell(cols.code + 1).value);
  if (!code) continue;
  excelRows.push({
    sourceRow: r,
    code,
    name_en: cellText(row.getCell(cols.nameEn + 1).value),
    name_cn: cellText(row.getCell(cols.nameCn + 1).value),
    brand_en: cols.brandEn >= 0 ? emptyDash(row.getCell(cols.brandEn + 1).value) : "",
    brand_cn: cols.brandCn >= 0 ? emptyDash(row.getCell(cols.brandCn + 1).value) : "",
    model: cols.model >= 0 ? emptyDash(row.getCell(cols.model + 1).value) : "",
    category: normalizeCategory(row.getCell(cols.category + 1).value),
    min_stock: toInt(row.getCell(cols.minStock + 1).value),
    notes: cols.notes >= 0 ? cellText(row.getCell(cols.notes + 1).value) : "",
    stock: cols.stock >= 0 ? toInt(row.getCell(cols.stock + 1).value) : 0,
    uom: cols.uom >= 0 ? normalizeUom(row.getCell(cols.uom + 1).value) : "PCS",
    location: cols.location >= 0 ? cellText(row.getCell(cols.location + 1).value) : "",
  });
}

console.log(`Parsed ${excelRows.length} data rows.`);

const superAdmin = await loadSuperAdmin();
const postingDate = todayStamp();
console.log(
  `Created-by: ${superAdmin.label} (system_user_id=${superAdmin.systemUserId})`,
);

await conn.beginTransaction();
try {
  const [catRows] = await conn.query(
    `SELECT id, code FROM sparepart_categories WHERE is_active = 1`,
  );
  const categoryIdByCode = new Map(
    catRows.map((row) => [String(row.code).toUpperCase(), Number(row.id)]),
  );
  const assemblyId =
    categoryIdByCode.get("ASM") ?? categoryIdByCode.get("ASSEMBLY");
  if (assemblyId) {
    categoryIdByCode.set("ASM", assemblyId);
    categoryIdByCode.set("ASSEMBLY", assemblyId);
  }

  const [uomRows] = await conn.query(
    `SELECT id, code FROM uoms WHERE is_active = 1`,
  );
  const uomIdByCode = new Map(
    uomRows.map((row) => [String(row.code).toUpperCase(), Number(row.id)]),
  );

  const locCache = new Map();
  async function resolveLoc(name) {
    const key = name.trim().toLowerCase();
    if (locCache.has(key)) return locCache.get(key);
    const loc = await ensureLocation(name);
    locCache.set(key, loc);
    return loc;
  }

  let upserted = 0;
  let posted101 = 0;
  let skippedDocs = 0;
  let skippedZero = 0;

  for (const item of excelRows) {
    if (!item.category) {
      throw new Error(`Row ${item.sourceRow} (${item.code}): invalid category.`);
    }
    const categoryId = categoryIdByCode.get(item.category);
    if (!categoryId) {
      throw new Error(
        `Row ${item.sourceRow} (${item.code}): category ${item.category} not in database.`,
      );
    }
    const uomId = uomIdByCode.get(item.uom);
    if (!uomId) {
      throw new Error(
        `Row ${item.sourceRow} (${item.code}): UoM ${item.uom} not in database.`,
      );
    }
    if (item.min_stock == null || item.min_stock < 0) {
      throw new Error(`Row ${item.sourceRow} (${item.code}): invalid min stock.`);
    }
    if (item.stock == null || item.stock < 0) {
      throw new Error(`Row ${item.sourceRow} (${item.code}): invalid stock current.`);
    }

    await conn.query(
      `INSERT INTO sparepart_items
        (code, name_en, name_cn, brand_en, brand_cn, model, notes,
         stock_current, min_stock, category_id, uom_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name_en = VALUES(name_en),
         name_cn = VALUES(name_cn),
         brand_en = VALUES(brand_en),
         brand_cn = VALUES(brand_cn),
         model = VALUES(model),
         notes = VALUES(notes),
         min_stock = VALUES(min_stock),
         category_id = VALUES(category_id),
         uom_id = VALUES(uom_id),
         deleted_at = NULL`,
      [
        item.code,
        item.name_en || null,
        item.name_cn || null,
        item.brand_en || null,
        item.brand_cn || null,
        item.model || null,
        item.notes || null,
        item.min_stock,
        categoryId,
        uomId,
      ],
    );
    const [idRows] = await conn.query(
      `SELECT id FROM sparepart_items WHERE code = ? LIMIT 1`,
      [item.code],
    );
    const itemId = Number(idRows[0].id);
    upserted += 1;

    if (item.stock === 0) {
      skippedZero += 1;
      continue;
    }
    if (!item.location) {
      throw new Error(
        `Row ${item.sourceRow} (${item.code}): location is required for opening stock.`,
      );
    }

    const clientReq = `OPENING-${item.code}`;
    const [existingDoc] = await conn.query(
      `SELECT id FROM sparepart_mat_docs WHERE client_request_id = ? LIMIT 1`,
      [clientReq],
    );
    if (existingDoc[0]) {
      skippedDocs += 1;
      continue;
    }

    const loc = await resolveLoc(item.location);
    const locLabel = `${loc.code} — ${loc.name}`;
    const docNumber = await nextDocNumber(postingDate);
    const [docIns] = await conn.query(
      `INSERT INTO sparepart_mat_docs
        (doc_number, movement_type, posting_date, header_text, recipient,
         created_by_system_user_id, created_by, client_request_id)
       VALUES (?, '101', ?, ?, NULL, ?, ?, ?)`,
      [
        docNumber,
        postingDate,
        "Opening stock — AGV & ASSEMBLY",
        superAdmin.systemUserId,
        superAdmin.label,
        clientReq,
      ],
    );
    await conn.query(
      `INSERT INTO sparepart_mat_doc_items
        (doc_id, item_id, line_no, qty, storage_location, storage_location_id, note)
       VALUES (?, ?, 1, ?, ?, ?, NULL)`,
      [docIns.insertId, itemId, item.stock, locLabel, loc.id],
    );
    await adjustBalance(itemId, loc.id, item.stock);
    await syncStockCurrent(itemId);
    posted101 += 1;
  }

  await conn.commit();
  console.log("Import complete.");
  console.log(`  Materials upserted: ${upserted}`);
  console.log(`  Docs 101 posted:    ${posted101}`);
  console.log(`  Docs already exist: ${skippedDocs}`);
  console.log(`  Zero-stock skipped: ${skippedZero}`);
} catch (err) {
  await conn.rollback();
  console.error("Import failed; rolled back.", err);
  process.exitCode = 1;
} finally {
  await conn.end();
}
