// One-off migration runner. Usage:
//   node --env-file=.env.local db/run-migrations.mjs
// Idempotent: only adds mes_data.deleted_at when it is missing.

import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const [cols] = await conn.query(
  `SELECT COLUMN_NAME FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'mes_data' AND COLUMN_NAME = 'deleted_at'`,
  [process.env.DB_NAME],
);

if (cols.length > 0) {
  console.log("mes_data.deleted_at already exists. Nothing to do.");
} else {
  await conn.query(
    "ALTER TABLE `mes_data` ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL",
  );
  console.log("Added mes_data.deleted_at.");
}

await conn.end();
