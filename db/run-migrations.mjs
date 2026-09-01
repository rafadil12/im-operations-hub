/**
 * Idempotent migration runner — applies schema/data changes in fixed order.
 *
 * Usage:
 *   node --env-file=.env.local db/run-migrations.mjs
 *
 * Optional:
 *   ALLOW_DEV_PASSWORD_RESET=1  — reset all system_users passwords (local dev only)
 *
 * SQL reference files live in db/migrations/*.sql; guards here keep re-runs safe
 * on databases that already applied some steps manually or via an older runner.
 */
import mysql from "mysql2/promise";
import { createMigrationHelpers } from "./lib/migrationHelpers.mjs";
import { readMigrationSql } from "./lib/readMigrationFiles.mjs";
import { createSchemaIntrospection } from "./lib/schemaIntrospection.mjs";
import { seedSparepartLocationsAndBalances } from "./lib/sparepartLocationSeed.mjs";
import { migrateSuperadminRoleId } from "./lib/superadminRoleId.mjs";

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

const schema = createSchemaIntrospection(conn, process.env.DB_NAME);
const { columnExists, columnType, columnLength, tableExists, indexExists, constraintExists, columnNullable } =
  schema;
const { tryAddFk, tryAddConstraint, applySqlFile } = createMigrationHelpers(conn);

// ---------------------------------------------------------------------------
// 001: mes_data.deleted_at
// ---------------------------------------------------------------------------
if (await columnExists("mes_data", "deleted_at")) {
  console.log("mes_data.deleted_at already exists.");
} else {
  await conn.query(readMigrationSql("001_add_deleted_at.sql"));
  console.log("Added mes_data.deleted_at.");
}

// ---------------------------------------------------------------------------
// 002: Option B RBAC (DDL guards + seed file)
// ---------------------------------------------------------------------------
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

await tryAddConstraint(
  `ALTER TABLE \`system_users\`
   ADD CONSTRAINT \`fk_system_users_role\`
   FOREIGN KEY (\`role_id\`) REFERENCES \`roles\` (\`id\`)
   ON DELETE RESTRICT ON UPDATE RESTRICT`,
  "fk_system_users_role",
);

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

await applySqlFile(
  "002_rbac_option_b.sql",
  readMigrationSql,
  "Applied RBAC seed (roles, permissions, mappings, admin bootstrap).",
);

// ---------------------------------------------------------------------------
// 003: Sparepart inventory
// ---------------------------------------------------------------------------
if (await tableExists("sparepart_items")) {
  console.log("sparepart_items already exists.");
} else {
  await conn.query(readMigrationSql("003_sparepart_inventory.sql"));
  console.log("Created sparepart_items.");
}

// ---------------------------------------------------------------------------
// 004: SAP IM material documents (+ legacy inbound/outbound migration)
// ---------------------------------------------------------------------------
if (await tableExists("sparepart_mat_docs")) {
  console.log("sparepart_mat_docs already exists.");
} else {
  await conn.query(readMigrationSql("004_sparepart_sap_im.sql"));
  console.log("Created sparepart_mat_docs, sparepart_mat_doc_items.");

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
        [docNumber, row.txn_date, "Migrated outbound", row.note || "unknown"],
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

// ---------------------------------------------------------------------------
// 005: Multi-location stock (tables, columns, seed, FKs)
// ---------------------------------------------------------------------------
if (!(await tableExists("sparepart_storage_locations"))) {
  await conn.query(readMigrationSql("005_storage_locations.sql"));
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

await seedSparepartLocationsAndBalances(conn, schema);

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

// ---------------------------------------------------------------------------
// 006: drop legacy sparepart_items.location
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 007: drop sparepart_items.default_storage_location_id
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 008: upgrade sparepart_mat_docs.posting_date to DATETIME
// ---------------------------------------------------------------------------
if ((await columnType("sparepart_mat_docs", "posting_date")) === "date") {
  await conn.query(readMigrationSql("008_sparepart_posting_date_datetime.sql"));
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
if (process.env.ALLOW_DEV_PASSWORD_RESET === "1") {
  await conn.query("UPDATE `system_users` SET `password_hash` = ?", [
    "$2b$12$cI4pxfYd4Rl7BCh28HcnJOjYPSgw2e83P4xhntednum009ojIEp/W",
  ]);
  console.warn(
    "ALLOW_DEV_PASSWORD_RESET=1: all system_users passwords were reset (local bootstrap only).",
  );
} else {
  console.log(
    "Skipped mass password reset (set ALLOW_DEV_PASSWORD_RESET=1 for local bootstrap only).",
  );
}

// ---------------------------------------------------------------------------
// Remove redundant guest role (Guest Mode = not logged in)
// ---------------------------------------------------------------------------
await applySqlFile(
  "004_remove_guest_role.sql",
  readMigrationSql,
  "Removed guest role (if present).",
);

// ---------------------------------------------------------------------------
// session_version for password-change invalidation
// ---------------------------------------------------------------------------
if (!(await columnExists("system_users", "session_version"))) {
  await conn.query(readMigrationSql("005_session_version.sql"));
  console.log("Added system_users.session_version.");
} else {
  console.log("system_users.session_version already exists.");
}

// ---------------------------------------------------------------------------
// Permissions catalog v2 + sparepart RBAC + role cleanup
// ---------------------------------------------------------------------------
await applySqlFile(
  "006_permissions_catalog_v2.sql",
  readMigrationSql,
  "Applied permissions catalog v2 (19 codes + legacy migration).",
);
await applySqlFile(
  "009_sparepart_permissions.sql",
  readMigrationSql,
  "Applied sparepart permissions catalog.",
);
await applySqlFile(
  "010_remove_manager_operator_roles.sql",
  readMigrationSql,
  "Removed manager/operator roles (if present).",
);

// ---------------------------------------------------------------------------
// 011: drop sparepart_items.stock_in / stock_out
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 012: Super Admin role + account
// ---------------------------------------------------------------------------
await applySqlFile(
  "012_superadmin_bootstrap.sql",
  readMigrationSql,
  "Applied Super Admin bootstrap (role + user + system_users).",
);

// ---------------------------------------------------------------------------
// 013: ensure superadmin has roles.id = 1
// ---------------------------------------------------------------------------
await migrateSuperadminRoleId(conn);

// ---------------------------------------------------------------------------
// 014: sparepart_items bilingual name/brand
// (inline guards: COALESCE(NULLIF(...)) differs from 014 SQL file)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 015: sparepart categories + min_stock
// ---------------------------------------------------------------------------
if (!(await tableExists("sparepart_categories"))) {
  await conn.query(readMigrationSql("015_sparepart_category_min_stock.sql"));
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
       SET code = 'ASM', name_en = 'ASSEMBLY', name_cn = '管道',
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
     ('ASM', 'ASSEMBLY', '管道', 3, 1),
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

// ---------------------------------------------------------------------------
// 016: uoms + sparepart_items.uom_id + AGV/ASSEMBLY racks
// ---------------------------------------------------------------------------
if (!(await tableExists("uoms"))) {
  await conn.query(readMigrationSql("016_uoms.sql"));
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
    ["AGV-RACK", "AGV RACK", "AGV货架"],
    ["ASM-RACK-A", "ASSEMBLY RACK A", "管道货架 A"],
    ["ASM-RACK-B", "ASSEMBLY RACK B", "管道货架 B"],
    ["ASM-RACK-C", "ASSEMBLY RACK C", "管道货架 C"],
    ["ASM-RACK-D", "ASSEMBLY RACK D", "管道货架 D"],
    ["ASM-RACK-E", "ASSEMBLY RACK E", "管道货架 E"],
    ["ASM-RACK-F", "ASSEMBLY RACK F", "管道货架 F"],
  ];
  const hasNameEn = await columnExists("sparepart_storage_locations", "name_en");
  for (const [code, nameEn, nameCn] of rackLocations) {
    const [existing] = await conn.query(
      hasNameEn
        ? `SELECT id FROM sparepart_storage_locations
           WHERE code = ? OR LOWER(name_en) = LOWER(?)
           LIMIT 1`
        : `SELECT id FROM sparepart_storage_locations
           WHERE code = ? OR LOWER(name) = LOWER(?)
           LIMIT 1`,
      [code, nameEn],
    );
    if (existing[0]) continue;
    if (hasNameEn) {
      await conn.query(
        `INSERT INTO sparepart_storage_locations (code, name_en, name_cn, is_active)
         VALUES (?, ?, ?, 1)`,
        [code, nameEn, nameCn],
      );
    } else {
      await conn.query(
        `INSERT INTO sparepart_storage_locations (code, name, is_active)
         VALUES (?, ?, 1)`,
        [code, nameEn],
      );
    }
    console.log(`Seeded storage location ${code} (${nameEn}).`);
  }
}

// ---------------------------------------------------------------------------
// 017: sparepart_items.is_active
// ---------------------------------------------------------------------------
if (await columnExists("sparepart_items", "is_active")) {
  console.log("sparepart_items.is_active already exists.");
} else {
  await conn.query(readMigrationSql("017_sparepart_items_is_active.sql"));
  console.log("Added sparepart_items.is_active.");
}

// ---------------------------------------------------------------------------
// 018: ASSEMBLY category CN label 组装 → 管道
// ---------------------------------------------------------------------------
if (await tableExists("sparepart_categories")) {
  const [updated] = await conn.query(
    `UPDATE sparepart_categories
     SET name_cn = '管道'
     WHERE UPPER(code) IN ('ASM', 'ASSEMBLY')
       AND name_cn <> '管道'`,
  );
  const count = /** @type {{ affectedRows?: number }} */ (updated).affectedRows ?? 0;
  if (count > 0) {
    console.log(`Updated ASSEMBLY category name_cn to 管道 (${count} row(s)).`);
  } else {
    console.log("ASSEMBLY category name_cn already 管道.");
  }
}

// ---------------------------------------------------------------------------
// 019: storage location bilingual names
// ---------------------------------------------------------------------------
if (await tableExists("sparepart_storage_locations")) {
  const hasName = await columnExists("sparepart_storage_locations", "name");
  const hasNameEn = await columnExists("sparepart_storage_locations", "name_en");
  const hasNameCn = await columnExists("sparepart_storage_locations", "name_cn");

  if (hasName && !hasNameEn) {
    await conn.query(
      `ALTER TABLE \`sparepart_storage_locations\`
       ADD COLUMN \`name_en\` VARCHAR(255) NULL AFTER \`code\``,
    );
    await conn.query(
      `UPDATE \`sparepart_storage_locations\` SET \`name_en\` = \`name\``,
    );
    await conn.query(
      `ALTER TABLE \`sparepart_storage_locations\`
       MODIFY COLUMN \`name_en\` VARCHAR(255) NOT NULL`,
    );
    console.log("Added sparepart_storage_locations.name_en from name.");
  } else if (hasNameEn) {
    console.log("sparepart_storage_locations.name_en already exists.");
  }

  if (!hasNameCn) {
    await conn.query(
      `ALTER TABLE \`sparepart_storage_locations\`
       ADD COLUMN \`name_cn\` VARCHAR(255) NULL AFTER \`name_en\``,
    );
    console.log("Added sparepart_storage_locations.name_cn.");
  } else {
    console.log("sparepart_storage_locations.name_cn already exists.");
  }

  /** @type {Array<[string, string]>} */
  const cnByCode = [
    ["SL000", "未分配"],
    ["SL001", "机房"],
    ["SL002", "前台接待"],
    ["SL003", "前台"],
    ["SL004", "IT工位"],
    ["SL005", "仓库"],
    ["SL006", "内部仓库"],
    ["SL007", "会议室"],
    ["SL008", "AGV货架"],
    ["SL009", "管道货架 A"],
    ["SL010", "管道货架 B"],
    ["SL011", "管道货架 C"],
    ["SL012", "管道货架 D"],
    ["SL013", "管道货架 E"],
    ["SL014", "管道货架 F"],
    ["SL015", "AGV工作站"],
    ["AGV-RACK", "AGV货架"],
    ["ASM-RACK-A", "管道货架 A"],
    ["ASM-RACK-B", "管道货架 B"],
    ["ASM-RACK-C", "管道货架 C"],
    ["ASM-RACK-D", "管道货架 D"],
    ["ASM-RACK-E", "管道货架 E"],
    ["ASM-RACK-F", "管道货架 F"],
  ];
  /** @type {Array<[string, string]>} */
  const cnByNameEn = [
    ["UNASSIGNED", "未分配"],
    ["SERVER ROOM", "机房"],
    ["RECEPTIONIST", "前台接待"],
    ["FRONT DESK", "前台"],
    ["IT DESK", "IT工位"],
    ["WAREHOUSE", "仓库"],
    ["INTERNAL WAREHOUSE", "内部仓库"],
    ["MEETING ROOM", "会议室"],
    ["AGV RACK", "AGV货架"],
    ["ASSEMBLY RACK A", "管道货架 A"],
    ["ASSEMBLY RACK B", "管道货架 B"],
    ["ASSEMBLY RACK C", "管道货架 C"],
    ["ASSEMBLY RACK D", "管道货架 D"],
    ["ASSEMBLY RACK E", "管道货架 E"],
    ["ASSEMBLY RACK F", "管道货架 F"],
    ["AGV WORKSTATION", "AGV工作站"],
  ];

  for (const [code, nameCn] of cnByCode) {
    await conn.query(
      `UPDATE sparepart_storage_locations
       SET name_cn = ?
       WHERE UPPER(code) = UPPER(?)`,
      [nameCn, code],
    );
  }
  for (const [nameEn, nameCn] of cnByNameEn) {
    await conn.query(
      `UPDATE sparepart_storage_locations
       SET name_cn = ?
       WHERE UPPER(TRIM(name_en)) = UPPER(?)
         AND (name_cn IS NULL OR name_cn = '' OR name_cn = name_en)`,
      [nameCn, nameEn],
    );
  }
  await conn.query(
    `UPDATE sparepart_storage_locations
     SET name_cn = name_en
     WHERE name_cn IS NULL OR TRIM(name_cn) = ''`,
  );
  await conn.query(
    `ALTER TABLE \`sparepart_storage_locations\`
     MODIFY COLUMN \`name_cn\` VARCHAR(255) NOT NULL`,
  );
  console.log("Backfilled sparepart_storage_locations.name_cn.");

  if (await columnExists("sparepart_storage_locations", "name")) {
    await conn.query(
      `ALTER TABLE \`sparepart_storage_locations\` DROP COLUMN \`name\``,
    );
    console.log("Dropped sparepart_storage_locations.name.");
  } else {
    console.log("sparepart_storage_locations.name already dropped.");
  }
}

// ---------------------------------------------------------------------------
// 020: Safety + sparepart overview permissions
// ---------------------------------------------------------------------------
await applySqlFile(
  "020_permissions_catalog_v3.sql",
  readMigrationSql,
  "Applied permissions catalog v3 (Safety + sparepart overview).",
);

// ---------------------------------------------------------------------------
// 021: Daily Operation PIC flag on login accounts
// ---------------------------------------------------------------------------
if (!(await columnExists("system_users", "is_daily_operation_pic"))) {
  await conn.query(readMigrationSql("021_daily_operation_pic.sql"));
  console.log(
    "Added system_users.is_daily_operation_pic and backfilled existing active non-superadmin accounts.",
  );
} else {
  console.log("system_users.is_daily_operation_pic already exists.");
}

// ---------------------------------------------------------------------------
// 022: Training module tables + permissions
// ---------------------------------------------------------------------------
await applySqlFile(
  "022_training_module.sql",
  readMigrationSql,
  "Applied training module (sessions, participants, permissions).",
);

// ---------------------------------------------------------------------------
// 023: Training divisions FK + bilingual topic/participant names
// ---------------------------------------------------------------------------
if (await tableExists("training_sessions")) {
  // division_id
  if (!(await columnExists("training_sessions", "division_id"))) {
    await conn.query(
      `ALTER TABLE \`training_sessions\`
       ADD COLUMN \`division_id\` INT NULL AFTER \`session_date\``,
    );
    console.log("Added training_sessions.division_id.");
  } else {
    console.log("training_sessions.division_id already exists.");
  }

  if (await columnExists("training_sessions", "category")) {
    await conn.query(`
      UPDATE \`training_sessions\` ts
      JOIN \`divisions\` d ON (
        (ts.category = 'mes' AND d.name_en = 'MES')
        OR (ts.category = 'intelligent' AND d.name_en = 'Intelligent Logistics')
        OR (ts.category = 'it' AND d.name_en = 'IT')
      )
      SET ts.division_id = d.id
      WHERE ts.division_id IS NULL
    `);
    await conn.query(`
      UPDATE \`training_sessions\`
      SET \`division_id\` = (SELECT MIN(id) FROM \`divisions\`)
      WHERE \`division_id\` IS NULL
    `);
    console.log("Backfilled training_sessions.division_id from category.");
  }

  if (await columnNullable("training_sessions", "division_id")) {
    await conn.query(
      `ALTER TABLE \`training_sessions\` MODIFY COLUMN \`division_id\` INT NOT NULL`,
    );
    console.log("training_sessions.division_id set NOT NULL.");
  }

  if (!(await indexExists("training_sessions", "idx_training_sessions_division"))) {
    await conn.query(
      `ALTER TABLE \`training_sessions\` ADD KEY \`idx_training_sessions_division\` (\`division_id\`)`,
    );
  }
  if (!(await indexExists("training_sessions", "idx_training_sessions_date_division"))) {
    await conn.query(
      `ALTER TABLE \`training_sessions\` ADD KEY \`idx_training_sessions_date_division\` (\`session_date\`, \`division_id\`)`,
    );
  }
  await tryAddConstraint(
    `ALTER TABLE \`training_sessions\`
     ADD CONSTRAINT \`fk_training_sessions_division\`
       FOREIGN KEY (\`division_id\`) REFERENCES \`divisions\` (\`id\`)`,
    "fk_training_sessions_division",
  );

  if (await indexExists("training_sessions", "idx_training_sessions_category")) {
    await conn.query(
      `ALTER TABLE \`training_sessions\` DROP INDEX \`idx_training_sessions_category\``,
    );
  }
  if (await indexExists("training_sessions", "idx_training_sessions_date_category")) {
    await conn.query(
      `ALTER TABLE \`training_sessions\` DROP INDEX \`idx_training_sessions_date_category\``,
    );
  }
  if (await columnExists("training_sessions", "category")) {
    await conn.query(`ALTER TABLE \`training_sessions\` DROP COLUMN \`category\``);
    console.log("Dropped training_sessions.category.");
  }

  // bilingual topic
  if (!(await columnExists("training_sessions", "topic_en"))) {
    await conn.query(
      `ALTER TABLE \`training_sessions\`
       ADD COLUMN \`topic_en\` VARCHAR(500) NULL AFTER \`division_id\`,
       ADD COLUMN \`topic_cn\` VARCHAR(500) NULL AFTER \`topic_en\``,
    );
    console.log("Added training_sessions.topic_en/topic_cn.");
  } else {
    console.log("training_sessions.topic_en already exists.");
  }

  if (await columnExists("training_sessions", "topic")) {
    await conn.query(`
      UPDATE \`training_sessions\`
      SET
        \`topic_en\` = COALESCE(\`topic_en\`, \`topic\`),
        \`topic_cn\` = COALESCE(\`topic_cn\`, \`topic\`)
    `);
    await conn.query(`
      ALTER TABLE \`training_sessions\`
       MODIFY COLUMN \`topic_en\` VARCHAR(500) NOT NULL,
       MODIFY COLUMN \`topic_cn\` VARCHAR(500) NOT NULL
    `);
    await conn.query(`ALTER TABLE \`training_sessions\` DROP COLUMN \`topic\``);
    console.log("Migrated training_sessions.topic → topic_en/topic_cn.");
  }

  // bilingual participant master
  if (await tableExists("training_participants")) {
    if (!(await columnExists("training_participants", "name_en"))) {
      await conn.query(
        `ALTER TABLE \`training_participants\`
         ADD COLUMN \`name_en\` VARCHAR(100) NULL AFTER \`id\`,
         ADD COLUMN \`name_cn\` VARCHAR(100) NULL AFTER \`name_en\``,
      );
      console.log("Added training_participants.name_en/name_cn.");
    }

    if (await columnExists("training_participants", "name")) {
      await conn.query(`
        UPDATE \`training_participants\`
        SET
          \`name_en\` = COALESCE(\`name_en\`, \`name\`),
          \`name_cn\` = COALESCE(\`name_cn\`, \`name\`)
      `);
      if (await indexExists("training_participants", "uk_training_participants_name")) {
        await conn.query(
          `ALTER TABLE \`training_participants\` DROP INDEX \`uk_training_participants_name\``,
        );
      }
      await conn.query(`
        ALTER TABLE \`training_participants\`
         MODIFY COLUMN \`name_en\` VARCHAR(100) NOT NULL,
         MODIFY COLUMN \`name_cn\` VARCHAR(100) NOT NULL
      `);
      if (!(await indexExists("training_participants", "uk_training_participants_name_en"))) {
        await conn.query(
          `ALTER TABLE \`training_participants\`
           ADD UNIQUE KEY \`uk_training_participants_name_en\` (\`name_en\`)`,
        );
      }
      await conn.query(`ALTER TABLE \`training_participants\` DROP COLUMN \`name\``);
      console.log("Migrated training_participants.name → name_en/name_cn.");
    }
  }

  // bilingual session participants snapshot
  if (await tableExists("training_session_participants")) {
    if (!(await columnExists("training_session_participants", "participant_name_en"))) {
      await conn.query(
        `ALTER TABLE \`training_session_participants\`
         ADD COLUMN \`participant_name_en\` VARCHAR(100) NULL AFTER \`session_id\`,
         ADD COLUMN \`participant_name_cn\` VARCHAR(100) NULL AFTER \`participant_name_en\``,
      );
      console.log("Added training_session_participants bilingual names.");
    }

    if (await columnExists("training_session_participants", "participant_name")) {
      await conn.query(`
        UPDATE \`training_session_participants\`
        SET
          \`participant_name_en\` = COALESCE(\`participant_name_en\`, \`participant_name\`),
          \`participant_name_cn\` = COALESCE(\`participant_name_cn\`, \`participant_name\`)
      `);
      if (await indexExists("training_session_participants", "idx_tsp_name")) {
        await conn.query(
          `ALTER TABLE \`training_session_participants\` DROP INDEX \`idx_tsp_name\``,
        );
      }
      await conn.query(`
        ALTER TABLE \`training_session_participants\`
         MODIFY COLUMN \`participant_name_en\` VARCHAR(100) NOT NULL,
         MODIFY COLUMN \`participant_name_cn\` VARCHAR(100) NOT NULL
      `);
      if (!(await indexExists("training_session_participants", "idx_tsp_name_en"))) {
        await conn.query(
          `ALTER TABLE \`training_session_participants\`
           ADD KEY \`idx_tsp_name_en\` (\`participant_name_en\`)`,
        );
      }
      await conn.query(
        `ALTER TABLE \`training_session_participants\` DROP COLUMN \`participant_name\``,
      );
      console.log("Migrated training_session_participants.participant_name → EN/CN.");
    }

    // Keep junction CN in sync with master when snapshot still mirrors EN.
    const [syncResult] = await conn.query(`
      UPDATE \`training_session_participants\` tsp
      JOIN \`training_participants\` tp ON tp.name_en = tsp.participant_name_en
      SET tsp.participant_name_cn = tp.name_cn
      WHERE tp.name_cn IS NOT NULL
        AND TRIM(tp.name_cn) <> ''
        AND (
          tsp.participant_name_cn IS NULL
          OR TRIM(tsp.participant_name_cn) = ''
          OR tsp.participant_name_cn = tsp.participant_name_en
        )
        AND tp.name_cn <> tsp.participant_name_en
    `);
    const synced = /** @type {{ affectedRows?: number }} */ (syncResult).affectedRows ?? 0;
    if (synced > 0) {
      console.log(`Synced ${synced} training_session_participants.name_cn from master.`);
    }
  }
} else {
  console.log("training_sessions missing; skipped 023 training bilingual migration.");
}

// ---------------------------------------------------------------------------
// 024: Report module tables + permissions
// ---------------------------------------------------------------------------
await applySqlFile(
  "024_report_module.sql",
  readMigrationSql,
  "Applied report module (areas, weeks, lines, permissions).",
);

// ---------------------------------------------------------------------------
// 025: Report submission reopen permission
// ---------------------------------------------------------------------------
await applySqlFile(
  "025_report_submission_reopen.sql",
  readMigrationSql,
  "Applied report submission reopen permission.",
);

// ---------------------------------------------------------------------------
// 026: report_sub_items replaces report_category_templates
// ---------------------------------------------------------------------------
await applySqlFile(
  "026_report_sub_items.sql",
  readMigrationSql,
  "Created report_sub_items table.",
);

const [lineCols] = await conn.query(
  `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'report_lines'
     AND COLUMN_NAME IN ('category_template_id', 'sub_item_id')`
);
const lineColSet = new Set(lineCols.map((r) => r.COLUMN_NAME));

const [templateTable] = await conn.query(
  `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'report_category_templates'`
);

if (templateTable.length > 0) {
  await conn.query(
    `INSERT INTO report_sub_items (area_id, name_en, name_cn, sort_order)
     SELECT area_id, name_en, name_cn, sort_order FROM report_category_templates
     ON DUPLICATE KEY UPDATE
       name_en = VALUES(name_en),
       sort_order = VALUES(sort_order)`
  );
  console.log("Migrated report_category_templates rows into report_sub_items.");
}

if (lineColSet.has("category_template_id") && !lineColSet.has("sub_item_id")) {
  await conn.query(
    `ALTER TABLE report_lines ADD COLUMN sub_item_id INT NULL AFTER area_id`
  );
  console.log("Added report_lines.sub_item_id.");

  if (templateTable.length > 0) {
    await conn.query(
      `UPDATE report_lines rl
       JOIN report_category_templates ct ON ct.id = rl.category_template_id
       JOIN report_sub_items si ON si.area_id = ct.area_id AND si.name_cn = ct.name_cn
       SET rl.sub_item_id = si.id
       WHERE rl.category_template_id IS NOT NULL`
    );
    console.log("Mapped category_template_id → sub_item_id on report_lines.");
  }

  try {
    await conn.query(`ALTER TABLE report_lines DROP FOREIGN KEY fk_report_lines_category`);
    console.log("Dropped fk_report_lines_category.");
  } catch (err) {
    console.log(`Skip drop fk_report_lines_category: ${err.message ?? err}`);
  }

  try {
    await conn.query(`ALTER TABLE report_lines DROP INDEX idx_report_lines_category`);
  } catch {
    /* index may not exist */
  }

  await conn.query(`ALTER TABLE report_lines DROP COLUMN category_template_id`);
  console.log("Dropped report_lines.category_template_id.");

  await tryAddFk(
    `ALTER TABLE report_lines
       ADD KEY idx_report_lines_sub_item (sub_item_id),
       ADD CONSTRAINT fk_report_lines_sub_item
         FOREIGN KEY (sub_item_id) REFERENCES report_sub_items (id)
         ON DELETE SET NULL`,
    "fk_report_lines_sub_item"
  );
} else if (lineColSet.has("sub_item_id")) {
  await tryAddFk(
    `ALTER TABLE report_lines
       ADD CONSTRAINT fk_report_lines_sub_item
         FOREIGN KEY (sub_item_id) REFERENCES report_sub_items (id)
         ON DELETE SET NULL`,
    "fk_report_lines_sub_item"
  );
}

if (templateTable.length > 0) {
  await conn.query(`DROP TABLE report_category_templates`);
  console.log("Dropped report_category_templates.");
}

// ---------------------------------------------------------------------------
// 027: Report week batch save — revisions, submitter audit, unique sub-item
// ---------------------------------------------------------------------------
await applySqlFile(
  "027_report_week_batch.sql",
  readMigrationSql,
  "Created report_line_revisions table.",
);

if (!(await columnExists("report_week_submissions", "submitted_by_system_user_id"))) {
  await conn.query(
    `ALTER TABLE report_week_submissions
       ADD COLUMN submitted_by_system_user_id INT NULL AFTER submitted_by,
       ADD COLUMN submitted_by_label VARCHAR(255) NULL AFTER submitted_by_system_user_id`
  );
  console.log("Added report_week_submissions submitter audit columns.");
} else {
  console.log("report_week_submissions submitter audit columns already exist.");
}

if (await columnExists("report_week_submissions", "submitted_by")) {
  await conn.query(
    `UPDATE report_week_submissions rws
     INNER JOIN system_users su ON su.user_id = rws.submitted_by
     SET rws.submitted_by_system_user_id = su.id
     WHERE rws.submitted_by IS NOT NULL AND rws.submitted_by_system_user_id IS NULL`
  );

  await conn.query(
    `UPDATE report_week_submissions rws
     INNER JOIN system_users su ON su.id = rws.submitted_by_system_user_id
     INNER JOIN users u ON u.id = su.user_id
     SET rws.submitted_by_label = TRIM(CONCAT(COALESCE(u.employee_no, ''), ' - ', COALESCE(u.name_en, u.name_cn, u.employee_no)))
     WHERE rws.submitted_by_system_user_id IS NOT NULL
       AND (rws.submitted_by_label IS NULL OR rws.submitted_by_label = '')`
  );

  await conn.query(`ALTER TABLE report_week_submissions DROP COLUMN submitted_by`);
  console.log("Migrated report_week_submissions.submitted_by → system_user audit columns.");
}

if (!(await indexExists("report_week_submissions", "idx_report_submission_submitted_by"))) {
  await conn.query(
    `ALTER TABLE report_week_submissions
       ADD INDEX idx_report_submission_submitted_by (submitted_by_system_user_id)`
  );
  console.log("Added idx_report_submission_submitted_by.");
}

await tryAddFk(
  `ALTER TABLE report_week_submissions
     ADD CONSTRAINT fk_report_submission_submitted_by_su
     FOREIGN KEY (submitted_by_system_user_id) REFERENCES system_users (id)
     ON DELETE SET NULL ON UPDATE CASCADE`,
  "fk_report_submission_submitted_by_su"
);

if (!(await indexExists("report_lines", "uk_report_lines_week_area_subitem"))) {
  const [dupes] = await conn.query(
    `SELECT COUNT(*) AS n FROM (
       SELECT week_id, area_id, sub_item_id
       FROM report_lines
       WHERE sub_item_id IS NOT NULL
       GROUP BY week_id, area_id, sub_item_id
       HAVING COUNT(*) > 1
     ) d`
  );
  if (Number(dupes[0]?.n ?? 0) > 0) {
    await conn.query(
      `DELETE rl1 FROM report_lines rl1
       INNER JOIN report_lines rl2
         ON rl1.week_id = rl2.week_id
        AND rl1.area_id = rl2.area_id
        AND rl1.sub_item_id = rl2.sub_item_id
        AND rl1.sub_item_id IS NOT NULL
        AND rl1.id > rl2.id`
    );
    console.log("Removed duplicate report_lines (week, area, sub-item).");
  }

  await conn.query(
    `ALTER TABLE report_lines
       ADD UNIQUE KEY uk_report_lines_week_area_subitem (week_id, area_id, sub_item_id)`
  );
  console.log("Added uk_report_lines_week_area_subitem.");
} else {
  console.log("uk_report_lines_week_area_subitem already exists.");
}

await applySqlFile(
  "028_report_week_attachments.sql",
  readMigrationSql,
  "Created report_week_attachments table.",
);

await conn.end();
console.log("Migrations complete.");
