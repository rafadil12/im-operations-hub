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

async function columnType(table, column) {
  const [rows] = await conn.query(
    `SELECT DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME, table, column],
  );
  return rows[0]?.DATA_TYPE?.toLowerCase() ?? null;
}

async function columnLength(table, column) {
  const [rows] = await conn.query(
    `SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME, table, column],
  );
  return Number(rows[0]?.CHARACTER_MAXIMUM_LENGTH ?? 0);
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

async function constraintExists(table, name) {
  const [rows] = await conn.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [process.env.DB_NAME, table, name],
  );
  return rows.length > 0;
}

async function columnNullable(table, column) {
  const [rows] = await conn.query(
    `SELECT IS_NULLABLE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME, table, column],
  );
  return rows[0]?.IS_NULLABLE === "YES";
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

if (!(await columnExists("sparepart_mat_docs", "created_by_system_user_id"))) {
  await conn.query(
    `ALTER TABLE \`sparepart_mat_docs\`
     ADD COLUMN \`created_by_system_user_id\` INT NULL DEFAULT NULL AFTER \`recipient\``,
  );
  console.log("Added sparepart_mat_docs.created_by_system_user_id.");
} else {
  console.log("sparepart_mat_docs.created_by_system_user_id already exists.");
}

if (
  (await columnType("sparepart_mat_docs", "created_by")) === "varchar" &&
  (await columnLength("sparepart_mat_docs", "created_by")) > 0 &&
  (await columnLength("sparepart_mat_docs", "created_by")) < 255
) {
  await conn.query(
    "ALTER TABLE `sparepart_mat_docs` MODIFY COLUMN `created_by` VARCHAR(255) NULL",
  );
  console.log("Expanded sparepart_mat_docs.created_by to VARCHAR(255).");
} else {
  console.log("sparepart_mat_docs.created_by already supports audit snapshot text.");
}

if (!(await indexExists("sparepart_mat_docs", "idx_sparepart_mat_docs_created_by_su"))) {
  await conn.query(
    `ALTER TABLE \`sparepart_mat_docs\`
     ADD INDEX \`idx_sparepart_mat_docs_created_by_su\` (\`created_by_system_user_id\`)`,
  );
  console.log("Added idx_sparepart_mat_docs_created_by_su.");
} else {
  console.log("idx_sparepart_mat_docs_created_by_su already exists.");
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
await tryAddFk(
  `ALTER TABLE \`sparepart_mat_docs\`
   ADD CONSTRAINT \`fk_sparepart_mat_docs_created_by_su\`
   FOREIGN KEY (\`created_by_system_user_id\`) REFERENCES \`system_users\` (\`id\`)
   ON DELETE RESTRICT ON UPDATE CASCADE`,
  "fk_sparepart_mat_docs_created_by_su",
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

// --- 008: upgrade sparepart_mat_docs.posting_date to DATETIME ---
if ((await columnType("sparepart_mat_docs", "posting_date")) === "date") {
  await conn.query(
    "ALTER TABLE `sparepart_mat_docs` MODIFY COLUMN `posting_date` DATETIME NOT NULL",
  );
  console.log("Updated sparepart_mat_docs.posting_date to DATETIME.");
} else {
  console.log("sparepart_mat_docs.posting_date already DATETIME-compatible.");
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

// Dev-only: reset all login passwords to the documented local test password.
// Never enable ALLOW_DEV_PASSWORD_RESET against shared/staging/production DBs.
if (process.env.ALLOW_DEV_PASSWORD_RESET === "1") {
  await conn.query(
    "UPDATE `system_users` SET `password_hash` = ?",
    [
      // bcrypt hash of the local test password documented in README (dev bootstrap only)
      "$2b$12$cI4pxfYd4Rl7BCh28HcnJOjYPSgw2e83P4xhntednum009ojIEp/W",
    ],
  );
  console.warn(
    "ALLOW_DEV_PASSWORD_RESET=1: all system_users passwords were reset (local bootstrap only).",
  );
} else {
  console.log(
    "Skipped mass password reset (set ALLOW_DEV_PASSWORD_RESET=1 for local bootstrap only).",
  );
}

// --- 004: remove redundant guest role (Guest Mode = not logged in) ---
const removeGuestSql = readFileSync(
  join(__dirname, "migrations", "004_remove_guest_role.sql"),
  "utf8",
);
await conn.query(removeGuestSql);
console.log("Removed guest role (if present).");

// --- 005: session_version for password-change invalidation ---
if (!(await columnExists("system_users", "session_version"))) {
  await conn.query(
    "ALTER TABLE `system_users` ADD COLUMN `session_version` INT NOT NULL DEFAULT 1",
  );
  console.log("Added system_users.session_version.");
} else {
  console.log("system_users.session_version already exists.");
}

// --- 006: expand permission catalog (19 codes) + migrate legacy ---
const catalogV2Sql = readFileSync(
  join(__dirname, "migrations", "006_permissions_catalog_v2.sql"),
  "utf8",
);
await conn.query(catalogV2Sql);
console.log("Applied permissions catalog v2 (19 codes + legacy migration).");

// --- 009: sparepart RBAC catalog ---
const sparepartPermSql = readFileSync(
  join(__dirname, "migrations", "009_sparepart_permissions.sql"),
  "utf8",
);
await conn.query(sparepartPermSql);
console.log("Applied sparepart permissions catalog.");

// --- 010: remove seeded manager/operator roles ---
const removeManagerOperatorSql = readFileSync(
  join(__dirname, "migrations", "010_remove_manager_operator_roles.sql"),
  "utf8",
);
await conn.query(removeManagerOperatorSql);
console.log("Removed manager/operator roles (if present).");

// --- 011: drop sparepart_items.stock_in / stock_out ---
if (await columnExists("sparepart_items", "stock_in")) {
  await conn.query("ALTER TABLE `sparepart_items` DROP COLUMN `stock_in`");
  console.log("Dropped sparepart_items.stock_in.");
} else {
  console.log("sparepart_items.stock_in already dropped.");
}
if (await columnExists("sparepart_items", "stock_out")) {
  await conn.query("ALTER TABLE `sparepart_items` DROP COLUMN `stock_out`");
  console.log("Dropped sparepart_items.stock_out.");
} else {
  console.log("sparepart_items.stock_out already dropped.");
}

// --- 012: Super Admin role + account ---
const superadminSql = readFileSync(
  join(__dirname, "migrations", "012_superadmin_bootstrap.sql"),
  "utf8",
);
await conn.query(superadminSql);
console.log("Applied Super Admin bootstrap (role + user + system_users).");

// --- 013: ensure superadmin has roles.id = 1 ---
{
  const [[sa]] = await conn.query(
    `SELECT id FROM roles WHERE name = 'superadmin' LIMIT 1`,
  );
  const [[adm]] = await conn.query(
    `SELECT id FROM roles WHERE name = 'admin' LIMIT 1`,
  );
  if (!sa) {
    console.log("Skip 013: superadmin role missing.");
  } else if (Number(sa.id) === 1) {
    console.log("superadmin already roles.id=1.");
  } else if (!adm || Number(adm.id) !== 1) {
    // superadmin not 1, and id=1 is free or not admin — move superadmin to 1
    const oldSa = Number(sa.id);
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    await conn.query(`UPDATE roles SET id = 1 WHERE id = ?`, [oldSa]);
    await conn.query(`UPDATE role_permissions SET role_id = 1 WHERE role_id = ?`, [
      oldSa,
    ]);
    await conn.query(`UPDATE system_users SET role_id = 1 WHERE role_id = ?`, [
      oldSa,
    ]);
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log(`Moved superadmin id ${oldSa} → 1.`);
  } else {
    // Swap admin (1) <-> superadmin (oldSa)
    const oldSa = Number(sa.id);
    const TEMP = 900001;
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    // admin 1 → TEMP
    await conn.query(`UPDATE roles SET id = ? WHERE id = 1`, [TEMP]);
    await conn.query(`UPDATE role_permissions SET role_id = ? WHERE role_id = 1`, [
      TEMP,
    ]);
    await conn.query(`UPDATE system_users SET role_id = ? WHERE role_id = 1`, [
      TEMP,
    ]);
    // superadmin oldSa → 1
    await conn.query(`UPDATE roles SET id = 1 WHERE id = ?`, [oldSa]);
    await conn.query(`UPDATE role_permissions SET role_id = 1 WHERE role_id = ?`, [
      oldSa,
    ]);
    await conn.query(`UPDATE system_users SET role_id = 1 WHERE role_id = ?`, [
      oldSa,
    ]);
    // admin TEMP → oldSa
    await conn.query(`UPDATE roles SET id = ? WHERE id = ?`, [oldSa, TEMP]);
    await conn.query(`UPDATE role_permissions SET role_id = ? WHERE role_id = ?`, [
      oldSa,
      TEMP,
    ]);
    await conn.query(`UPDATE system_users SET role_id = ? WHERE role_id = ?`, [
      oldSa,
      TEMP,
    ]);
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log(`Swapped roles: superadmin → id=1, admin → id=${oldSa}.`);
  }

  // Keep SUPERADMIN account on superadmin role
  await conn.query(
    `UPDATE system_users su
     JOIN users u ON u.id = su.user_id
     JOIN roles r ON r.name = 'superadmin'
     SET su.role_id = r.id, su.is_active = 1
     WHERE u.employee_no = 'SUPERADMIN'`,
  );
}

// --- 014: sparepart_items bilingual name/brand ---
if (!(await columnExists("sparepart_items", "name_en"))) {
  await conn.query(
    "ALTER TABLE `sparepart_items` ADD COLUMN `name_en` VARCHAR(255) NULL AFTER `code`",
  );
  console.log("Added sparepart_items.name_en.");
} else {
  console.log("sparepart_items.name_en already exists.");
}
if (!(await columnExists("sparepart_items", "name_cn"))) {
  await conn.query(
    "ALTER TABLE `sparepart_items` ADD COLUMN `name_cn` VARCHAR(255) NULL AFTER `name_en`",
  );
  console.log("Added sparepart_items.name_cn.");
} else {
  console.log("sparepart_items.name_cn already exists.");
}
if (!(await columnExists("sparepart_items", "brand_en"))) {
  await conn.query(
    "ALTER TABLE `sparepart_items` ADD COLUMN `brand_en` VARCHAR(128) NULL AFTER `name_cn`",
  );
  console.log("Added sparepart_items.brand_en.");
} else {
  console.log("sparepart_items.brand_en already exists.");
}
if (!(await columnExists("sparepart_items", "brand_cn"))) {
  await conn.query(
    "ALTER TABLE `sparepart_items` ADD COLUMN `brand_cn` VARCHAR(128) NULL AFTER `brand_en`",
  );
  console.log("Added sparepart_items.brand_cn.");
} else {
  console.log("sparepart_items.brand_cn already exists.");
}
if (await columnExists("sparepart_items", "name")) {
  await conn.query(
    `UPDATE sparepart_items SET
       name_en = COALESCE(NULLIF(name_en, ''), name),
       name_cn = COALESCE(NULLIF(name_cn, ''), name),
       brand_en = COALESCE(brand_en, brand),
       brand_cn = COALESCE(brand_cn, brand)`,
  );
  console.log("Backfilled sparepart_items bilingual columns from name/brand.");
  await conn.query("ALTER TABLE `sparepart_items` DROP COLUMN `name`");
  console.log("Dropped sparepart_items.name.");
} else {
  console.log("sparepart_items.name already dropped.");
}
if (await columnExists("sparepart_items", "brand")) {
  await conn.query("ALTER TABLE `sparepart_items` DROP COLUMN `brand`");
  console.log("Dropped sparepart_items.brand.");
} else {
  console.log("sparepart_items.brand already dropped.");
}

// --- 015: sparepart categories + min_stock ---
if (!(await tableExists("sparepart_categories"))) {
  const sql015 = readFileSync(
    join(__dirname, "migrations", "015_sparepart_category_min_stock.sql"),
    "utf8",
  );
  await conn.query(sql015);
  console.log("Created sparepart_categories.");
} else {
  console.log("sparepart_categories already exists.");
}

if (await tableExists("sparepart_categories")) {
  const [asmRows] = await conn.query(
    `SELECT id FROM sparepart_categories WHERE UPPER(code) = 'ASM' LIMIT 1`,
  );
  const [assemblyRows] = await conn.query(
    `SELECT id FROM sparepart_categories WHERE UPPER(code) = 'ASSEMBLY' LIMIT 1`,
  );
  const keepId = asmRows[0]?.id ?? assemblyRows[0]?.id;
  if (keepId) {
    const [dupRows] = await conn.query(
      `SELECT id, code FROM sparepart_categories
       WHERE id <> ? AND UPPER(code) IN ('ASM', 'ASSEMBLY')`,
      [keepId],
    );
    for (const dup of dupRows) {
      if (await tableExists("sparepart_items")) {
        const [moved] = await conn.query(
          `UPDATE sparepart_items SET category_id = ? WHERE category_id = ?`,
          [keepId, dup.id],
        );
        const count = /** @type {{ affectedRows?: number }} */ (moved).affectedRows ?? 0;
        if (count > 0) {
          console.log(
            `Moved ${count} sparepart_items from category ${dup.code} → id ${keepId}.`,
          );
        }
      }
      await conn.query(`DELETE FROM sparepart_categories WHERE id = ?`, [dup.id]);
      console.log(`Deleted duplicate sparepart category ${dup.code} (id ${dup.id}).`);
    }
    await conn.query(
      `UPDATE sparepart_categories
       SET code = 'ASM', name_en = 'ASSEMBLY', name_cn = '组装',
           sort_order = 3, is_active = 1
       WHERE id = ?`,
      [keepId],
    );
    console.log(`Normalized assembly category to code ASM / name ASSEMBLY on id ${keepId}.`);
  }
}

await conn.query(
  `INSERT INTO sparepart_categories (code, name_en, name_cn, sort_order, is_active)
   VALUES
     ('IT', 'IT', 'IT', 1, 1),
     ('AGV', 'AGV', 'AGV', 2, 1),
     ('ASM', 'ASSEMBLY', '组装', 3, 1),
     ('MES', 'MES', 'MES', 4, 1)
   ON DUPLICATE KEY UPDATE
     name_en = VALUES(name_en),
     name_cn = VALUES(name_cn),
     sort_order = VALUES(sort_order)`,
);
console.log("Seeded sparepart_categories (IT, AGV, ASM, MES).");

if (await tableExists("sparepart_items")) {
  if (!(await columnExists("sparepart_items", "min_stock"))) {
    await conn.query(
      "ALTER TABLE `sparepart_items` ADD COLUMN `min_stock` INT NOT NULL DEFAULT 0 AFTER `stock_current`",
    );
    console.log("Added sparepart_items.min_stock.");
  } else {
    console.log("sparepart_items.min_stock already exists.");
  }

  if (!(await columnExists("sparepart_items", "category_id"))) {
    await conn.query(
      "ALTER TABLE `sparepart_items` ADD COLUMN `category_id` INT NULL DEFAULT NULL AFTER `min_stock`",
    );
    console.log("Added sparepart_items.category_id.");
  } else {
    console.log("sparepart_items.category_id already exists.");
  }

  const [itRows] = await conn.query(
    `SELECT id FROM sparepart_categories WHERE code = 'IT' LIMIT 1`,
  );
  const itId = itRows[0]?.id;
  if (itId) {
    const [upd] = await conn.query(
      `UPDATE sparepart_items SET category_id = ? WHERE category_id IS NULL`,
      [itId],
    );
    const filled = /** @type {{ affectedRows?: number }} */ (upd).affectedRows ?? 0;
    if (filled > 0) {
      console.log(`Backfilled ${filled} sparepart_items.category_id → IT.`);
    } else {
      console.log("sparepart_items.category_id already backfilled.");
    }

    if (await columnNullable("sparepart_items", "category_id")) {
      await conn.query(
        "ALTER TABLE `sparepart_items` MODIFY COLUMN `category_id` INT NOT NULL",
      );
      console.log("sparepart_items.category_id set NOT NULL.");
    } else {
      console.log("sparepart_items.category_id already NOT NULL.");
    }
  } else {
    console.log("Skip category_id backfill: IT category not found.");
  }

  if (!(await indexExists("sparepart_items", "idx_sparepart_items_category"))) {
    await conn.query(
      "ALTER TABLE `sparepart_items` ADD INDEX `idx_sparepart_items_category` (`category_id`)",
    );
    console.log("Added idx_sparepart_items_category.");
  } else {
    console.log("idx_sparepart_items_category already exists.");
  }

  if (!(await constraintExists("sparepart_items", "fk_sparepart_items_category"))) {
    await conn.query(
      `ALTER TABLE \`sparepart_items\`
       ADD CONSTRAINT \`fk_sparepart_items_category\`
       FOREIGN KEY (\`category_id\`) REFERENCES \`sparepart_categories\` (\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    console.log("Added fk_sparepart_items_category.");
  } else {
    console.log("fk_sparepart_items_category already exists.");
  }
}

// --- 016: uoms + sparepart_items.uom_id + AGV/ASSEMBLY racks ---
if (!(await tableExists("uoms"))) {
  const sql016 = readFileSync(join(__dirname, "migrations", "016_uoms.sql"), "utf8");
  await conn.query(sql016);
  console.log("Created uoms.");
} else {
  console.log("uoms already exists.");
}

await conn.query(
  `INSERT INTO uoms (code, name_en, name_cn, sort_order, is_active)
   VALUES
     ('PCS', 'Pieces', '件', 1, 1),
     ('PACK', 'Pack', '包', 2, 1),
     ('ROLL', 'Roll', '卷', 3, 1),
     ('MTR', 'Meter', '米', 4, 1)
   ON DUPLICATE KEY UPDATE
     name_en = VALUES(name_en),
     name_cn = VALUES(name_cn),
     sort_order = VALUES(sort_order)`,
);
console.log("Seeded uoms (PCS, PACK, ROLL, MTR).");

if (await tableExists("sparepart_items")) {
  if (!(await columnExists("sparepart_items", "uom_id"))) {
    await conn.query(
      "ALTER TABLE `sparepart_items` ADD COLUMN `uom_id` INT NULL DEFAULT NULL AFTER `category_id`",
    );
    console.log("Added sparepart_items.uom_id.");
  } else {
    console.log("sparepart_items.uom_id already exists.");
  }

  const [pcsRows] = await conn.query(
    `SELECT id FROM uoms WHERE code = 'PCS' LIMIT 1`,
  );
  const pcsId = pcsRows[0]?.id;
  if (pcsId) {
    const [upd] = await conn.query(
      `UPDATE sparepart_items SET uom_id = ? WHERE uom_id IS NULL`,
      [pcsId],
    );
    const filled = /** @type {{ affectedRows?: number }} */ (upd).affectedRows ?? 0;
    if (filled > 0) {
      console.log(`Backfilled ${filled} sparepart_items.uom_id → PCS.`);
    } else {
      console.log("sparepart_items.uom_id already backfilled.");
    }

    if (await columnNullable("sparepart_items", "uom_id")) {
      await conn.query(
        "ALTER TABLE `sparepart_items` MODIFY COLUMN `uom_id` INT NOT NULL",
      );
      console.log("sparepart_items.uom_id set NOT NULL.");
    }
  } else {
    console.log("Skip uom_id backfill: PCS UoM not found.");
  }

  if (!(await indexExists("sparepart_items", "idx_sparepart_items_uom"))) {
    await conn.query(
      "ALTER TABLE `sparepart_items` ADD INDEX `idx_sparepart_items_uom` (`uom_id`)",
    );
    console.log("Added idx_sparepart_items_uom.");
  } else {
    console.log("idx_sparepart_items_uom already exists.");
  }

  if (!(await constraintExists("sparepart_items", "fk_sparepart_items_uom"))) {
    await conn.query(
      `ALTER TABLE \`sparepart_items\`
       ADD CONSTRAINT \`fk_sparepart_items_uom\`
       FOREIGN KEY (\`uom_id\`) REFERENCES \`uoms\` (\`id\`)
       ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    console.log("Added fk_sparepart_items_uom.");
  } else {
    console.log("fk_sparepart_items_uom already exists.");
  }
}

if (await tableExists("sparepart_storage_locations")) {
  const rackLocations = [
    ["AGV-RACK", "AGV RACK"],
    ["ASM-RACK-A", "ASSEMBLY RACK A"],
    ["ASM-RACK-B", "ASSEMBLY RACK B"],
    ["ASM-RACK-C", "ASSEMBLY RACK C"],
    ["ASM-RACK-D", "ASSEMBLY RACK D"],
    ["ASM-RACK-E", "ASSEMBLY RACK E"],
    ["ASM-RACK-F", "ASSEMBLY RACK F"],
  ];
  for (const [code, name] of rackLocations) {
    const [existing] = await conn.query(
      `SELECT id FROM sparepart_storage_locations
       WHERE code = ? OR LOWER(name) = LOWER(?)
       LIMIT 1`,
      [code, name],
    );
    if (existing[0]) continue;
    await conn.query(
      `INSERT INTO sparepart_storage_locations (code, name, is_active)
       VALUES (?, ?, 1)`,
      [code, name],
    );
    console.log(`Seeded storage location ${code} (${name}).`);
  }
}

await conn.end();
console.log("Migrations complete.");
