// Idempotent migration runner. Usage:
//   node --env-file=.env.local db/run-migrations.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

async function columnExists(table, column) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME, table, column],
  );
  return rows.length > 0;
}

async function tableExists(table) {
  const [rows] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.DB_NAME, table],
  );
  return rows.length > 0;
}

async function indexExists(table, indexName) {
  const [rows] = await conn.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [process.env.DB_NAME, table, indexName],
  );
  return rows.length > 0;
}

// --- 001: mes_data.deleted_at ---
if (await columnExists("mes_data", "deleted_at")) {
  console.log("mes_data.deleted_at already exists.");
} else {
  await conn.query(
    "ALTER TABLE `mes_data` ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL",
  );
  console.log("Added mes_data.deleted_at.");
}

// --- 002: Option B RBAC ---
if (!(await columnExists("system_users", "role_id"))) {
  await conn.query(
    "ALTER TABLE `system_users` ADD COLUMN `role_id` INT NULL DEFAULT NULL",
  );
  console.log("Added system_users.role_id.");
} else {
  console.log("system_users.role_id already exists.");
}

if (!(await indexExists("system_users", "idx_system_users_role_id"))) {
  await conn.query(
    "ALTER TABLE `system_users` ADD INDEX `idx_system_users_role_id` (`role_id`)",
  );
  console.log("Added index idx_system_users_role_id.");
}

// FK may already exist from a previous run
try {
  await conn.query(
    `ALTER TABLE \`system_users\`
     ADD CONSTRAINT \`fk_system_users_role\`
     FOREIGN KEY (\`role_id\`) REFERENCES \`roles\` (\`id\`)
     ON DELETE RESTRICT ON UPDATE RESTRICT`,
  );
  console.log("Added fk_system_users_role.");
} catch (err) {
  const code = /** @type {{ code?: string }} */ (err).code;
  if (code === "ER_DUP_KEYNAME" || code === "ER_FK_DUP_NAME" || code === "ER_CANNOT_ADD_FOREIGN") {
    console.log("fk_system_users_role already present (or skipped).");
  } else if (String(err).includes("Duplicate") || code === "ER_DUP_FIELDNAME") {
    console.log("fk_system_users_role already present.");
  } else {
    // MariaDB often uses errno 121 for duplicate FK
    const errno = /** @type {{ errno?: number }} */ (err).errno;
    if (errno === 121 || errno === 1005 || errno === 1826) {
      console.log("fk_system_users_role already present.");
    } else {
      throw err;
    }
  }
}

if (!(await tableExists("role_permissions"))) {
  await conn.query(`
    CREATE TABLE \`role_permissions\` (
      \`role_id\` INT NOT NULL,
      \`permission_id\` INT NOT NULL,
      PRIMARY KEY (\`role_id\`, \`permission_id\`),
      CONSTRAINT \`fk_role_permissions_role\`
        FOREIGN KEY (\`role_id\`) REFERENCES \`roles\` (\`id\`)
        ON DELETE CASCADE ON UPDATE RESTRICT,
      CONSTRAINT \`fk_role_permissions_permission\`
        FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\` (\`id\`)
        ON DELETE CASCADE ON UPDATE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
  console.log("Created role_permissions.");
} else {
  console.log("role_permissions already exists.");
}

if (!(await indexExists("users", "uk_users_employee_no"))) {
  // Only add UNIQUE if no duplicate employee_no values
  const [dups] = await conn.query(
    `SELECT employee_no, COUNT(*) AS c FROM users
     WHERE employee_no IS NOT NULL AND employee_no != ''
     GROUP BY employee_no HAVING c > 1`,
  );
  if (dups.length === 0) {
    await conn.query(
      "ALTER TABLE `users` ADD UNIQUE INDEX `uk_users_employee_no` (`employee_no`)",
    );
    console.log("Added uk_users_employee_no.");
  } else {
    console.log("Skipped uk_users_employee_no (duplicate employee_no values).");
  }
} else {
  console.log("uk_users_employee_no already exists.");
}

const seedSql = readFileSync(
  join(__dirname, "migrations", "002_rbac_option_b.sql"),
  "utf8",
);
await conn.query(seedSql);
console.log("Applied RBAC seed (roles, permissions, mappings, admin bootstrap).");

// --- 003: Sparepart inventory ---
if (await tableExists("sparepart_items")) {
  console.log("sparepart_items already exists.");
} else {
  const sparepartSql = readFileSync(
    join(__dirname, "migrations", "003_sparepart_inventory.sql"),
    "utf8",
  );
  await conn.query(sparepartSql);
  console.log("Created sparepart_items.");
}

// --- 004: SAP IM material documents ---
if (await tableExists("sparepart_mat_docs")) {
  console.log("sparepart_mat_docs already exists.");
} else {
  const sapSql = readFileSync(
    join(__dirname, "migrations", "004_sparepart_sap_im.sql"),
    "utf8",
  );
  await conn.query(sapSql);
  console.log("Created sparepart_mat_docs, sparepart_mat_doc_items.");

  // Migrate legacy inbound → docs 101
  if (await tableExists("sparepart_inbound")) {
    const [inbounds] = await conn.query(
      `SELECT id, item_id, txn_date, qty, note FROM sparepart_inbound ORDER BY id ASC`,
    );
    for (const row of inbounds) {
      const docNumber = `MIG-IN-${String(row.id).padStart(6, "0")}`;
      const [ins] = await conn.query(
        `INSERT INTO sparepart_mat_docs
          (doc_number, movement_type, posting_date, header_text, recipient)
         VALUES (?, '101', ?, ?, NULL)`,
        [docNumber, row.txn_date, row.note || "Migrated inbound"],
      );
      await conn.query(
        `INSERT INTO sparepart_mat_doc_items
          (doc_id, item_id, line_no, qty, storage_location, note)
         VALUES (?, ?, 1, ?, NULL, ?)`,
        [ins.insertId, row.item_id, row.qty, row.note],
      );
    }
    if (inbounds.length) {
      console.log(`Migrated ${inbounds.length} inbound row(s) to material docs.`);
    }
  }

  // Migrate legacy outbound → docs 201
  if (await tableExists("sparepart_outbound")) {
    const [outbounds] = await conn.query(
      `SELECT id, item_id, txn_date, qty, note FROM sparepart_outbound ORDER BY id ASC`,
    );
    for (const row of outbounds) {
      const docNumber = `MIG-OUT-${String(row.id).padStart(6, "0")}`;
      const [ins] = await conn.query(
        `INSERT INTO sparepart_mat_docs
          (doc_number, movement_type, posting_date, header_text, recipient)
         VALUES (?, '201', ?, ?, ?)`,
        [
          docNumber,
          row.txn_date,
          "Migrated outbound",
          row.note || "unknown",
        ],
      );
      await conn.query(
        `INSERT INTO sparepart_mat_doc_items
          (doc_id, item_id, line_no, qty, storage_location, note)
         VALUES (?, ?, 1, ?, NULL, ?)`,
        [ins.insertId, row.item_id, row.qty, row.note],
      );
    }
    if (outbounds.length) {
      console.log(`Migrated ${outbounds.length} outbound row(s) to material docs.`);
    }
  }
}

if (await tableExists("sparepart_inbound")) {
  await conn.query("DROP TABLE `sparepart_inbound`");
  console.log("Dropped sparepart_inbound.");
}
if (await tableExists("sparepart_outbound")) {
  await conn.query("DROP TABLE `sparepart_outbound`");
  console.log("Dropped sparepart_outbound.");
}

// --- 005: Multi-location stock ---
function slugLocationCode(name) {
  const slug = String(name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return slug || "LOC";
}

function normalizeLocationName(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || trimmed === "-") return null;
  if (/^recepcionist$/i.test(trimmed)) return "Receptionist";
  return trimmed;
}

function splitLocationNames(raw) {
  if (raw == null || String(raw).trim() === "" || String(raw).trim() === "-") {
    return [];
  }
  const parts = String(raw)
    .split(",")
    .map((p) => normalizeLocationName(p))
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const name of parts) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** One-shot physical corrections for mes_dashboard (not used by new imports). */
const SEED_BALANCE_EXCEPTIONS = {
  IT00056: [
    { name: "Gudang Internal", qty: 6 },
    { name: "Meja IT", qty: 0 },
  ],
  IT00057: [
    { name: "Gudang Internal", qty: 17 },
    { name: "Meja IT", qty: 0 },
  ],
  IT00058: [
    { name: "Gudang Internal", qty: 13 },
    { name: "Meja IT", qty: 0 },
  ],
  IT00104: [
    { name: "Server Room", qty: 1 },
    { name: "Meja IT", qty: 1 },
  ],
  IT00004: [
    { name: "Server Room", qty: 0 },
    { name: "Meja IT", qty: 0 },
  ],
};

if (!(await tableExists("sparepart_storage_locations"))) {
  const sql005 = readFileSync(
    join(__dirname, "migrations", "005_storage_locations.sql"),
    "utf8",
  );
  await conn.query(sql005);
  console.log("Created sparepart_storage_locations, sparepart_stock_balances.");
} else {
  console.log("sparepart_storage_locations already exists.");
}

if (!(await columnExists("sparepart_mat_doc_items", "storage_location_id"))) {
  await conn.query(
    `ALTER TABLE \`sparepart_mat_doc_items\`
     ADD COLUMN \`storage_location_id\` INT NULL DEFAULT NULL AFTER \`storage_location\``,
  );
  console.log("Added sparepart_mat_doc_items.storage_location_id.");
} else {
  console.log("sparepart_mat_doc_items.storage_location_id already exists.");
}

if (!(await columnExists("sparepart_mat_doc_items", "to_storage_location_id"))) {
  await conn.query(
    `ALTER TABLE \`sparepart_mat_doc_items\`
     ADD COLUMN \`to_storage_location_id\` INT NULL DEFAULT NULL AFTER \`storage_location_id\``,
  );
  console.log("Added sparepart_mat_doc_items.to_storage_location_id.");
} else {
  console.log("sparepart_mat_doc_items.to_storage_location_id already exists.");
}

if (!(await columnExists("sparepart_items", "default_storage_location_id"))) {
  // Intentionally not re-adding: column removed in migration 007.
  console.log("sparepart_items.default_storage_location_id not present (dropped).");
} else {
  console.log("sparepart_items.default_storage_location_id still present (will drop below).");
}

if (!(await columnExists("sparepart_mat_docs", "client_request_id"))) {
  await conn.query(
    `ALTER TABLE \`sparepart_mat_docs\`
     ADD COLUMN \`client_request_id\` VARCHAR(64) NULL DEFAULT NULL AFTER \`created_by\`,
     ADD COLUMN \`reversal_of_doc_id\` INT NULL DEFAULT NULL AFTER \`client_request_id\``,
  );
  console.log("Added sparepart_mat_docs.client_request_id, reversal_of_doc_id.");
} else {
  console.log("sparepart_mat_docs.client_request_id already exists.");
}

if (!(await indexExists("sparepart_mat_docs", "uk_sparepart_mat_docs_client_req"))) {
  try {
    await conn.query(
      `ALTER TABLE \`sparepart_mat_docs\`
       ADD UNIQUE INDEX \`uk_sparepart_mat_docs_client_req\` (\`client_request_id\`)`,
    );
    console.log("Added uk_sparepart_mat_docs_client_req.");
  } catch (err) {
    const errno = /** @type {{ errno?: number }} */ (err).errno;
    if (errno === 1061 || errno === 1062) {
      console.log("uk_sparepart_mat_docs_client_req already present.");
    } else {
      throw err;
    }
  }
}

// Seed locations + balances once (idempotent: skip if any balance exists)
const [balanceCountRows] = await conn.query(
  `SELECT COUNT(*) AS c FROM sparepart_stock_balances`,
);
const balanceCount = Number(balanceCountRows[0]?.c ?? 0);

if (balanceCount === 0 && (await tableExists("sparepart_items"))) {
  const locationIdByName = new Map();

  async function ensureLocation(name, { active = true } = {}) {
    const key = name.toLowerCase();
    if (locationIdByName.has(key)) return locationIdByName.get(key);
    const code = slugLocationCode(name);
    const [existing] = await conn.query(
      `SELECT id, name FROM sparepart_storage_locations
       WHERE code = ? OR LOWER(name) = ? LIMIT 1`,
      [code, key],
    );
    if (existing[0]) {
      locationIdByName.set(key, existing[0].id);
      locationIdByName.set(String(existing[0].name).toLowerCase(), existing[0].id);
      return existing[0].id;
    }
    const [ins] = await conn.query(
      `INSERT INTO sparepart_storage_locations (code, name, is_active)
       VALUES (?, ?, ?)`,
      [code, name, active ? 1 : 0],
    );
    locationIdByName.set(key, ins.insertId);
    return ins.insertId;
  }

  const unassignedId = await ensureLocation("UNASSIGNED");

  const hasLegacyLocation = await columnExists("sparepart_items", "location");
  const [itemRows] = await conn.query(
    hasLegacyLocation
      ? `SELECT id, code, location, stock_current
         FROM sparepart_items
         WHERE deleted_at IS NULL
         ORDER BY id ASC`
      : `SELECT id, code, NULL AS location, stock_current
         FROM sparepart_items
         WHERE deleted_at IS NULL
         ORDER BY id ASC`,
  );

  // Collect all location names first
  for (const item of itemRows) {
    for (const name of splitLocationNames(item.location)) {
      await ensureLocation(name);
    }
  }
  for (const entries of Object.values(SEED_BALANCE_EXCEPTIONS)) {
    for (const e of entries) {
      await ensureLocation(e.name);
    }
  }

  for (const item of itemRows) {
    const code = String(item.code);
    const exception = SEED_BALANCE_EXCEPTIONS[code];
    /** @type {{ name: string, qty: number }[]} */
    let seeds;
    if (exception) {
      seeds = exception;
    } else {
      const names = splitLocationNames(item.location);
      if (names.length === 0) {
        seeds = [{ name: "UNASSIGNED", qty: Number(item.stock_current) || 0 }];
      } else {
        seeds = names.map((name, idx) => ({
          name,
          qty: idx === 0 ? Number(item.stock_current) || 0 : 0,
        }));
      }
    }

    let firstLocId = unassignedId;
    for (let i = 0; i < seeds.length; i += 1) {
      const seed = seeds[i];
      const locId = await ensureLocation(seed.name);
      if (i === 0) firstLocId = locId;
      await conn.query(
        `INSERT INTO sparepart_stock_balances (item_id, storage_location_id, qty)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE qty = VALUES(qty)`,
        [item.id, locId, seed.qty],
      );
    }

    const [sumRows] = await conn.query(
      `SELECT COALESCE(SUM(qty), 0) AS total
       FROM sparepart_stock_balances WHERE item_id = ?`,
      [item.id],
    );
    const sumQty = Number(sumRows[0]?.total ?? 0);
    if (sumQty !== Number(item.stock_current)) {
      throw new Error(
        `Seed balance mismatch for ${code}: SUM(balances)=${sumQty} vs stock_current=${item.stock_current}`,
      );
    }

    if (await columnExists("sparepart_items", "default_storage_location_id")) {
      await conn.query(
        `UPDATE sparepart_items
         SET default_storage_location_id = ?
         WHERE id = ?`,
        [firstLocId, item.id],
      );
    }
  }

  // Backfill mat_doc_items.storage_location_id from text snapshot
  const [docLines] = await conn.query(
    `SELECT id, storage_location FROM sparepart_mat_doc_items
     WHERE storage_location_id IS NULL AND storage_location IS NOT NULL
       AND storage_location != ''`,
  );
  let backfilled = 0;
  for (const line of docLines) {
    const names = splitLocationNames(line.storage_location);
    const name = names[0];
    if (!name) continue;
    const locId = locationIdByName.get(name.toLowerCase());
    if (!locId) continue;
    await conn.query(
      `UPDATE sparepart_mat_doc_items SET storage_location_id = ? WHERE id = ?`,
      [locId, line.id],
    );
    backfilled += 1;
  }

  console.log(
    `Seeded locations/balances for ${itemRows.length} item(s); backfilled ${backfilled} doc line location id(s).`,
  );
} else if (balanceCount > 0) {
  console.log("sparepart_stock_balances already seeded; skipping seed.");
}

// Soft FKs for new columns (best-effort)
async function tryAddFk(sql, label) {
  try {
    await conn.query(sql);
    console.log(`Added ${label}.`);
  } catch (err) {
    const errno = /** @type {{ errno?: number }} */ (err).errno;
    const code = /** @type {{ code?: string }} */ (err).code;
    if (
      errno === 121 ||
      errno === 1005 ||
      errno === 1826 ||
      code === "ER_DUP_KEYNAME" ||
      code === "ER_FK_DUP_NAME"
    ) {
      console.log(`${label} already present.`);
    } else {
      console.log(`Skipped ${label}: ${err.message ?? err}`);
    }
  }
}

await tryAddFk(
  `ALTER TABLE \`sparepart_mat_doc_items\`
   ADD CONSTRAINT \`fk_sparepart_mat_doc_items_loc\`
   FOREIGN KEY (\`storage_location_id\`) REFERENCES \`sparepart_storage_locations\` (\`id\`)
   ON DELETE RESTRICT ON UPDATE CASCADE`,
  "fk_sparepart_mat_doc_items_loc",
);
await tryAddFk(
  `ALTER TABLE \`sparepart_mat_doc_items\`
   ADD CONSTRAINT \`fk_sparepart_mat_doc_items_to_loc\`
   FOREIGN KEY (\`to_storage_location_id\`) REFERENCES \`sparepart_storage_locations\` (\`id\`)
   ON DELETE RESTRICT ON UPDATE CASCADE`,
  "fk_sparepart_mat_doc_items_to_loc",
);
await tryAddFk(
  `ALTER TABLE \`sparepart_mat_docs\`
   ADD CONSTRAINT \`fk_sparepart_mat_docs_reversal\`
   FOREIGN KEY (\`reversal_of_doc_id\`) REFERENCES \`sparepart_mat_docs\` (\`id\`)
   ON DELETE RESTRICT ON UPDATE CASCADE`,
  "fk_sparepart_mat_docs_reversal",
);

// --- 006: drop legacy sparepart_items.location ---
if (await columnExists("sparepart_items", "location")) {
  if (await indexExists("sparepart_items", "idx_sparepart_items_location")) {
    await conn.query(
      "ALTER TABLE `sparepart_items` DROP INDEX `idx_sparepart_items_location`",
    );
    console.log("Dropped index idx_sparepart_items_location.");
  }
  await conn.query("ALTER TABLE `sparepart_items` DROP COLUMN `location`");
  console.log("Dropped sparepart_items.location.");
} else {
  console.log("sparepart_items.location already dropped.");
}

// --- 007: drop sparepart_items.default_storage_location_id ---
if (await columnExists("sparepart_items", "default_storage_location_id")) {
  try {
    await conn.query(
      "ALTER TABLE `sparepart_items` DROP FOREIGN KEY `fk_sparepart_items_default_loc`",
    );
    console.log("Dropped fk_sparepart_items_default_loc.");
  } catch (err) {
    console.log(`Skip drop fk_sparepart_items_default_loc: ${err.message ?? err}`);
  }
  await conn.query(
    "ALTER TABLE `sparepart_items` DROP COLUMN `default_storage_location_id`",
  );
  console.log("Dropped sparepart_items.default_storage_location_id.");
} else {
  console.log("sparepart_items.default_storage_location_id already dropped.");
}

// Cleanup: remove empty balance rows (qty <= 0) left by older transfers
if (await tableExists("sparepart_stock_balances")) {
  const [delResult] = await conn.query(
    `DELETE FROM sparepart_stock_balances WHERE qty <= 0`,
  );
  const removed = /** @type {{ affectedRows?: number }} */ (delResult).affectedRows ?? 0;
  if (removed > 0) {
    console.log(`Removed ${removed} empty stock balance row(s).`);
  } else {
    console.log("No empty stock balance rows to remove.");
  }
}

await conn.end();
console.log("Migrations complete.");
