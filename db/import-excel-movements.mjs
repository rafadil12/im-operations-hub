// One-shot: import historical movements from IT备品备件清单.xlsx
// into mat docs + balances (per-item locations from IT Stock / 地点).
//
// Usage:
//   node --env-file=.env.local db/import-excel-movements.mjs --force
//
// Requires --force (wipes mat docs + stock balances).

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const WORKBOOK = join(root, "IT备品备件清单.xlsx");

const args = new Set(process.argv.slice(2));
if (!args.has("--force")) {
  console.error(
    "Refusing to run without --force (this clears mat docs + stock balances).",
  );
  process.exit(1);
}

/** Excel display name → preferred DB location name (existing seeds). */
const LOCATION_ALIASES = {
  "server room": "SERVER ROOM",
  "recepcionist": "RECEPTIONIST",
  receptionist: "RECEPTIONIST",
  "meja depan": "FRONT DESK",
  "meja it": "IT DESK",
  warehouse: "WAREHOUSE",
  "gudang internal": "INTERNAL WAREHOUSE",
  "meeting room": "MEETING ROOM",
  unassigned: "UNASSIGNED",
};

/**
 * Hardcoded multi-location overrides (101 and 201 use the same list).
 * - single string → all qty to that location
 * - string[] → split qty evenly across list (floor + remainder from left)
 */
const LOCATION_OVERRIDES = {
  IT00004: "Server Room",
  IT00056: "Gudang Internal",
  IT00057: "Gudang Internal",
  IT00058: "Gudang Internal",
  IT00104: ["Server Room", "Meja IT"],
};

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
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function toInt(value) {
  const n = Number(cellText(value));
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

function toDateTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d} 00:00:00`;
  }
  const text = cellText(value);
  const m = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return `${m[1]} 00:00:00`;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const mo = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${mo}-${d} 00:00:00`;
  }
  return null;
}

function parseLocationList(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

/** Distribute qty across N locations: floor + remainder from the left. */
function distributeQty(qty, locationNames) {
  const n = locationNames.length;
  if (n === 0) return [];
  if (n === 1) return [{ name: locationNames[0], qty }];
  const base = Math.floor(qty / n);
  let rem = qty % n;
  return locationNames.map((name) => {
    const q = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
    return { name, qty: q };
  }).filter((x) => x.qty > 0);
}

function locationsForCode(code, excelRaw) {
  const override = LOCATION_OVERRIDES[code];
  if (override != null) {
    return Array.isArray(override) ? [...override] : [override];
  }
  const parsed = parseLocationList(excelRaw);
  return parsed.length ? parsed : ["UNASSIGNED"];
}

async function ensureLocation(displayName) {
  const key = displayName.trim().toLowerCase();
  const preferred = LOCATION_ALIASES[key] || displayName.trim();

  const [byName] = await conn.query(
    `SELECT id, code, name_en, name_cn FROM sparepart_storage_locations
     WHERE is_active = 1
       AND (
         UPPER(name_en) = UPPER(?)
         OR UPPER(name_cn) = UPPER(?)
         OR UPPER(code) = UPPER(?)
       )
     LIMIT 1`,
    [preferred, preferred, preferred],
  );
  if (byName[0]) return byName[0];

  // Also try original display name
  if (preferred !== displayName.trim()) {
    const [orig] = await conn.query(
      `SELECT id, code, name_en, name_cn FROM sparepart_storage_locations
       WHERE is_active = 1
         AND (
           UPPER(name_en) = UPPER(?)
           OR UPPER(name_cn) = UPPER(?)
           OR UPPER(code) = UPPER(?)
         )
       LIMIT 1`,
      [displayName.trim(), displayName.trim(), displayName.trim()],
    );
    if (orig[0]) return orig[0];
  }

  const code = slugLocationCode(preferred);
  const [byCode] = await conn.query(
    `SELECT id, code, name_en, name_cn FROM sparepart_storage_locations
     WHERE code = ? LIMIT 1`,
    [code],
  );
  if (byCode[0]) return byCode[0];

  const [ins] = await conn.query(
    `INSERT INTO sparepart_storage_locations (code, name_en, name_cn, is_active)
     VALUES (?, ?, ?, 1)`,
    [code, preferred, preferred],
  );
  return {
    id: ins.insertId,
    code,
    name_en: preferred,
    name_cn: preferred,
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

async function ensureItem(row) {
  const [existing] = await conn.query(
    `SELECT id FROM sparepart_items WHERE code = ? LIMIT 1`,
    [row.code],
  );
  if (existing[0]) {
    await conn.query(
      `UPDATE sparepart_items
       SET deleted_at = NULL,
           name = COALESCE(NULLIF(?, ''), name),
           brand = COALESCE(NULLIF(?, ''), brand),
           model = COALESCE(NULLIF(?, ''), model)
       WHERE id = ?`,
      [row.name, row.brand || null, row.model || null, existing[0].id],
    );
    return Number(existing[0].id);
  }
  const [ins] = await conn.query(
    `INSERT INTO sparepart_items
      (code, name, brand, model, notes, stock_current)
     VALUES (?, ?, ?, ?, NULL, 0)`,
    [row.code, row.name || row.code, row.brand || null, row.model || null],
  );
  return Number(ins.insertId);
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

function findSheet(wb, patterns) {
  return (
    wb.worksheets.find((ws) =>
      patterns.some((p) => p.test(ws.name)),
    ) ?? null
  );
}

console.log(`Loading ${WORKBOOK}…`);
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(WORKBOOK);

const stockSheet =
  findSheet(wb, [/IT Stock/i, /库存/]) || wb.worksheets[0];
const masukSheet = findSheet(wb, [/Barang Masuk/i, /进库/]);
const keluarSheet = findSheet(wb, [/Barang Keluar/i, /出库/]);

if (!stockSheet || !masukSheet || !keluarSheet) {
  console.error("Missing required sheets: IT Stock库存, Barang Masuk进库, Barang Keluar出库");
  process.exit(1);
}

/** @type {Map<string, { rawLoc: string, name: string, brand: string, model: string }>} */
const master = new Map();
stockSheet.eachRow((row, n) => {
  if (n === 1) return;
  const code = cellText(row.getCell(1).value);
  if (!code) return;
  master.set(code, {
    rawLoc: cellText(row.getCell(7).value).replace(/\n/g, " "),
    name: cellText(row.getCell(4).value),
    brand: cellText(row.getCell(5).value),
    model: cellText(row.getCell(6).value),
  });
});

function loadMovements(sheet, movementType, qtyCol) {
  const rows = [];
  sheet.eachRow((row, n) => {
    if (n === 1) return;
    const postingDate = toDateTime(row.getCell(1).value);
    const code = cellText(row.getCell(2).value);
    const name = cellText(row.getCell(5).value);
    const brand = cellText(row.getCell(6).value);
    const model = cellText(row.getCell(7).value);
    const qty = toInt(row.getCell(qtyCol).value);
    const notes = cellText(row.getCell(9).value);
    if (!code) return;
    rows.push({
      movementType,
      postingDate,
      code,
      name,
      brand,
      model,
      qty,
      notes,
      sourceRow: n,
    });
  });
  return rows;
}

// Barang Masuk/Keluar in master workbook: qty is column 8
const masuk = loadMovements(masukSheet, "101", 8);
const keluar = loadMovements(keluarSheet, "201", 8);

const movements = [...masuk, ...keluar]
  .filter((r) => r.qty > 0)
  .filter((r) => {
    if (!r.postingDate) {
      console.warn(`Skip ${r.movementType} row ${r.sourceRow}: invalid date`);
      return false;
    }
    return true;
  })
  .sort((a, b) => {
    if (a.postingDate !== b.postingDate) {
      return a.postingDate < b.postingDate ? -1 : 1;
    }
    if (a.movementType !== b.movementType) {
      return a.movementType === "101" ? -1 : 1;
    }
    return a.sourceRow - b.sourceRow;
  });

console.log(`Master items: ${master.size}; movements: ${movements.length}`);

const superAdmin = await loadSuperAdmin();
console.log(
  `Created-by: ${superAdmin.label} (system_user_id=${superAdmin.systemUserId})`,
);

const locCache = new Map();
async function resolveLoc(name) {
  const key = name.trim().toLowerCase();
  if (locCache.has(key)) return locCache.get(key);
  const loc = await ensureLocation(name);
  locCache.set(key, loc);
  return loc;
}

await conn.beginTransaction();
try {
  console.log("Clearing mat docs + balances…");
  await conn.query(`DELETE FROM sparepart_mat_doc_items`);
  await conn.query(
    `UPDATE sparepart_mat_docs SET reversal_of_doc_id = NULL WHERE reversal_of_doc_id IS NOT NULL`,
  );
  await conn.query(`DELETE FROM sparepart_mat_docs`);
  await conn.query(`DELETE FROM sparepart_stock_balances`);
  await conn.query(`UPDATE sparepart_items SET stock_current = 0`);

  let posted101 = 0;
  let posted201 = 0;
  let createdItems = 0;
  const warnings = [];
  const touchedItems = new Set();
  const knownCodes = new Set();

  for (const mov of movements) {
    const meta = master.get(mov.code);
    const row = {
      code: mov.code,
      name: mov.name || meta?.name || mov.code,
      brand: mov.brand || meta?.brand || "",
      model: mov.model || meta?.model || "",
    };

    const [existingRows] = await conn.query(
      `SELECT id FROM sparepart_items WHERE code = ? LIMIT 1`,
      [mov.code],
    );
    const isNew = !existingRows[0];
    const itemId = await ensureItem(row);
    if (isNew && !knownCodes.has(mov.code)) createdItems += 1;
    knownCodes.add(mov.code);
    touchedItems.add(itemId);

    const locNames = locationsForCode(mov.code, meta?.rawLoc ?? "");
    const parts = distributeQty(mov.qty, locNames);

    const docNumber = await nextDocNumber(mov.postingDate);
    const recipient =
      mov.movementType === "201"
        ? mov.notes || "Historical import"
        : null;
    const headerText =
      mov.movementType === "101"
        ? "Historical import — Barang Masuk进库"
        : "Historical import — Barang Keluar出库";
    const clientReq = `hist-${mov.movementType}-${mov.code}-${mov.postingDate.slice(0, 10)}-r${mov.sourceRow}`;

    const [docIns] = await conn.query(
      `INSERT INTO sparepart_mat_docs
        (doc_number, movement_type, posting_date, header_text, recipient,
         created_by_system_user_id, created_by, client_request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docNumber,
        mov.movementType,
        mov.postingDate,
        headerText,
        recipient,
        superAdmin.systemUserId,
        superAdmin.label,
        clientReq,
      ],
    );
    const docId = docIns.insertId;

    let lineNo = 0;
    for (const part of parts) {
      lineNo += 1;
      const loc = await resolveLoc(part.name);
      const locLabel = `${loc.code} — ${loc.name_en}`;
      await conn.query(
        `INSERT INTO sparepart_mat_doc_items
          (doc_id, item_id, line_no, qty, storage_location, storage_location_id, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          docId,
          itemId,
          lineNo,
          part.qty,
          locLabel,
          loc.id,
          mov.notes || null,
        ],
      );

      const delta = mov.movementType === "101" ? part.qty : -part.qty;
      const nextQty = await adjustBalance(itemId, loc.id, delta);
      if (nextQty < 0) {
        warnings.push(
          `${mov.code} @ ${mov.postingDate.slice(0, 10)} ${mov.movementType} ${loc.name_en}: temp ${nextQty}`,
        );
      }
    }

    await syncStockCurrent(itemId);
    if (mov.movementType === "101") posted101 += 1;
    else posted201 += 1;
  }

  const [neg] = await conn.query(
    `SELECT i.code, b.qty, loc.name_en AS loc
     FROM sparepart_stock_balances b
     JOIN sparepart_items i ON i.id = b.item_id
     JOIN sparepart_storage_locations loc ON loc.id = b.storage_location_id
     WHERE b.qty < 0`,
  );
  if (neg.length) {
    throw new Error(
      `Abort: negative final balances: ${neg
        .map((r) => `${r.code}@${r.loc}=${r.qty}`)
        .join(", ")}`,
    );
  }

  await conn.query(`DELETE FROM sparepart_stock_balances WHERE qty <= 0`);
  for (const itemId of touchedItems) {
    await syncStockCurrent(itemId);
  }

  await conn.commit();

  console.log("Import complete.");
  console.log(`  Created materials: ${createdItems}`);
  console.log(`  Docs 101 (in):     ${posted101}`);
  console.log(`  Docs 201 (out):    ${posted201}`);
  console.log(`  Temp underflow warnings: ${warnings.length}`);
  for (const w of warnings.slice(0, 20)) console.warn(`  ! ${w}`);
  if (warnings.length > 20) {
    console.warn(`  … and ${warnings.length - 20} more`);
  }
} catch (err) {
  await conn.rollback();
  console.error("Import failed; rolled back.", err);
  process.exitCode = 1;
} finally {
  await conn.end();
}
