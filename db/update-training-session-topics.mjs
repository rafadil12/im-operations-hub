/**
 * Update training_sessions.topic_en / topic_cn from training_sessions.xls by id.
 * Usage: node --env-file=.env.local db/update-training-session-topics.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const wb = XLSX.readFile(path.join(root, "training_sessions.xls"));
const excel = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
  defval: null,
});

if (!excel.length) {
  throw new Error("Excel has no rows.");
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

let updated = 0;
let skipped = 0;
let missing = 0;

try {
  await conn.beginTransaction();

  for (const row of excel) {
    const id = Number(row.id);
    const topicEn = String(row.topic_en ?? "").trim();
    const topicCn = String(row.topic_cn ?? "").trim();

    if (!id || !topicEn || !topicCn) {
      skipped++;
      console.warn(`Skip invalid row id=${row.id} en=${topicEn} cn=${topicCn}`);
      continue;
    }

    const [result] = await conn.query(
      `UPDATE training_sessions
       SET topic_en = ?, topic_cn = ?
       WHERE id = ?`,
      [topicEn, topicCn, id]
    );

    if (result.affectedRows === 0) {
      missing++;
      console.warn(`No DB row for id=${id}`);
    } else {
      updated++;
    }
  }

  await conn.commit();
  console.log(
    `Done. updated=${updated} skipped=${skipped} missing=${missing} excel=${excel.length}`
  );
} catch (err) {
  await conn.rollback();
  throw err;
} finally {
  await conn.end();
}
