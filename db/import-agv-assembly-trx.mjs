// Import AGV & ASSEMBLY historical transactions from CSV.
// Reads `AGV & ASSEMBLY TRX.csv`, creates mat docs + adjusts balances.
// Idempotent via client_request_id per row.
//
// Usage:
//   node --env-file=.env.local db/import-agv-assembly-trx.mjs

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const CSV_FILE = join(root, "AGV & ASSEMBLY TRX.csv");

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: false,
});

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 5) continue;
    const code = cols[0].trim();
    let postingDate = cols[1].trim();
    const qty = Math.trunc(Number(cols[2]));
    const moveType = cols[3].trim();
    const locationId = Number(cols[4]);
    // Fix known typo: 2023 → 2026
    if (postingDate.startsWith("2023-")) {
      postingDate = "2026-" + postingDate.slice(5);
    }
    if (!code || !moveType || !locationId) continue;
    if (qty <= 0) continue;
    rows.push({ code, postingDate, qty, moveType, locationId, sourceRow: i + 1 });
  }
  return rows;
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
    throw new Error("Super Admin not found. Run migrations first.");
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
     LIMIT 1 FOR UPDATE`,
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
    await conn.query(`DELETE FROM sparepart_stock_balances WHERE id = ?`, [rows[0].id]);
    return 0;
  }
  await conn.query(`UPDATE sparepart_stock_balances SET qty = ? WHERE id = ?`, [next, rows[0].id]);
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

console.log(`Loading ${CSV_FILE}…`);
const csvText = readFileSync(CSV_FILE, "utf-8");
const rows = parseCSV(csvText);

// Sort: 101 first, then by date
rows.sort((a, b) => {
  if (a.moveType !== b.moveType) return a.moveType === "101" ? -1 : 1;
  if (a.postingDate !== b.postingDate) return a.postingDate < b.postingDate ? -1 : 1;
  return a.sourceRow - b.sourceRow;
});

console.log(`Parsed ${rows.length} rows (after skipping qty=0).`);

const superAdmin = await loadSuperAdmin();
console.log(`Created-by: ${superAdmin.label} (system_user_id=${superAdmin.systemUserId})`);

// Pre-load location labels
const [locRows] = await conn.query(
  `SELECT id, code, name_en, name_cn FROM sparepart_storage_locations WHERE is_active = 1`,
  );
const locMap = new Map(locRows.map((r) => [Number(r.id), r]));

await conn.beginTransaction();
try {
  let posted101 = 0;
  let posted201 = 0;
  let skipped = 0;
  const warnings = [];
  const touchedItems = new Set();

  for (const row of rows) {
    const clientReq = `TRX-${row.moveType}-${row.code}-${row.postingDate.slice(0, 10)}-r${row.sourceRow}`;

    // Idempotency check
    const [existing] = await conn.query(
      `SELECT id FROM sparepart_mat_docs WHERE client_request_id = ? LIMIT 1`,
      [clientReq],
    );
    if (existing[0]) {
      skipped += 1;
      continue;
    }

    // Find item
    const [itemRows] = await conn.query(
      `SELECT id FROM sparepart_items WHERE code = ? AND deleted_at IS NULL LIMIT 1`,
      [row.code],
    );
    if (!itemRows[0]) {
      warnings.push(`Row ${row.sourceRow}: item ${row.code} not found in DB, skipped.`);
      continue;
    }
    const itemId = Number(itemRows[0].id);

    // Validate location
    const loc = locMap.get(row.locationId);
    if (!loc) {
      warnings.push(`Row ${row.sourceRow}: location id ${row.locationId} not found, skipped.`);
      continue;
    }
    const locLabel = `${loc.code} — ${loc.name_en}`;

    const headerText =
      row.moveType === "101"
        ? "Historical import — Barang Masuk"
        : "Historical import — Barang Keluar";

    const docNumber = await nextDocNumber(row.postingDate);
    const [docIns] = await conn.query(
      `INSERT INTO sparepart_mat_docs
        (doc_number, movement_type, posting_date, header_text, recipient,
         created_by_system_user_id, created_by, client_request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docNumber,
        row.moveType,
        row.postingDate,
        headerText,
        row.moveType === "201" ? "Historical import" : null,
        superAdmin.systemUserId,
        superAdmin.label,
        clientReq,
      ],
    );

    await conn.query(
      `INSERT INTO sparepart_mat_doc_items
        (doc_id, item_id, line_no, qty, storage_location, storage_location_id, note)
       VALUES (?, ?, 1, ?, ?, ?, ?)`,
      [docIns.insertId, itemId, row.qty, locLabel, row.locationId, null],
    );

    const delta = row.moveType === "101" ? row.qty : -row.qty;
    const nextQty = await adjustBalance(itemId, row.locationId, delta);
    if (nextQty < 0) {
      warnings.push(
        `${row.code} @ ${row.postingDate.slice(0, 10)} ${row.moveType}: balance went to ${nextQty}`,
      );
    }

    touchedItems.add(itemId);
    if (row.moveType === "101") posted101 += 1;
    else posted201 += 1;
  }

  // Final check: no negative balances
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

  // Sync stock_current for all touched items
  for (const itemId of touchedItems) {
    await syncStockCurrent(itemId);
  }

  await conn.commit();

  console.log("Import complete.");
  console.log(`  Docs 101 (in):     ${posted101}`);
  console.log(`  Docs 201 (out):    ${posted201}`);
  console.log(`  Already existed:   ${skipped}`);
  console.log(`  Warnings:          ${warnings.length}`);
  for (const w of warnings.slice(0, 30)) console.warn(`  ! ${w}`);
  if (warnings.length > 30) console.warn(`  … and ${warnings.length - 30} more`);
} catch (err) {
  await conn.rollback();
  console.error("Import failed; rolled back.", err);
  process.exitCode = 1;
} finally {
  await conn.end();
}
