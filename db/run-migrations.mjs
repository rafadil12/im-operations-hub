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

await conn.end();
console.log("Migrations complete.");
