/**
 * Import training sessions from 培训记录_Training+Notes.xlsx
 * Sheets: MES, INTELLIGENT, IT (SAFETY skipped).
 * Resolves sheet → divisions.id; topic/participant names stored bilingual (same text both sides).
 * Attachments are not copied (Excel links only) — upload later in Session.
 *
 * Usage:
 *   node --env-file=.env.local db/import-training-notes.mjs
 *   node --env-file=.env.local db/import-training-notes.mjs --force
 */
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const force = process.argv.includes("--force");

/** Sheet name → divisions.name_en match */
const SHEET_DIVISION_EN = {
  MES: "MES",
  INTELLIGENT: "Intelligent Logistics",
  IT: "IT",
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
    if (typeof value === "string") return value;
  }
  return String(value);
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const text = cellText(value).replace(/^"|"$/g, "").trim();
  if (!text) return null;
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseParticipants(raw) {
  return [
    ...new Set(
      cellText(raw)
        .split(/[,，;/|]+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((name) => name.toUpperCase())
    ),
  ].map((name) => ({ nameEn: name, nameCn: name }));
}

async function main() {
  const excelPath = path.join(root, "培训记录_Training+Notes.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);

  const {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
  } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error("Missing DB env vars.");
  }

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
    const [[{ count }]] = await conn.query(
      "SELECT COUNT(*) AS count FROM training_sessions"
    );

    if (Number(count) > 0 && !force) {
      console.log(
        `training_sessions already has ${count} rows. Re-run with --force to truncate and re-import.`
      );
      return;
    }

    const [divisionRows] = await conn.query(
      "SELECT id, name_en FROM divisions ORDER BY id"
    );
    const divisionIdByEn = new Map(
      divisionRows.map((row) => [String(row.name_en ?? "").trim(), Number(row.id)])
    );

    for (const nameEn of Object.values(SHEET_DIVISION_EN)) {
      if (!divisionIdByEn.has(nameEn)) {
        throw new Error(
          `Division "${nameEn}" not found in divisions table. Seed divisions first.`
        );
      }
    }

    if (force) {
      await conn.query("SET FOREIGN_KEY_CHECKS=0");
      await conn.query("TRUNCATE TABLE training_session_participants");
      await conn.query("TRUNCATE TABLE training_sessions");
      await conn.query("TRUNCATE TABLE training_participants");
      await conn.query("SET FOREIGN_KEY_CHECKS=1");
      console.log("Truncated training tables.");
    }

    // Master participants from Peserta sheet
    const pesertaSheet = wb.getWorksheet("Peserta");
    if (pesertaSheet) {
      for (let r = 1; r <= pesertaSheet.rowCount; r++) {
        const name = cellText(pesertaSheet.getRow(r).getCell(1).value)
          .trim()
          .toUpperCase();
        if (!name || name === "PESERTA") continue;
        await conn.query(
          `
            INSERT INTO training_participants (name_en, name_cn, is_active)
            VALUES (?, ?, 1)
            ON DUPLICATE KEY UPDATE
              name_cn = VALUES(name_cn),
              is_active = 1
          `,
          [name, name]
        );
      }
    }

    let imported = 0;
    let skipped = 0;

    for (const [sheetName, divisionNameEn] of Object.entries(SHEET_DIVISION_EN)) {
      const ws = wb.getWorksheet(sheetName);
      if (!ws) {
        console.warn(`Sheet missing: ${sheetName}`);
        continue;
      }

      const divisionId = divisionIdByEn.get(divisionNameEn);

      for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const sessionDate = parseDate(row.getCell(1).value);
        const topic = cellText(row.getCell(2).value).trim();
        const participants = parseParticipants(row.getCell(3).value);
        const totalRaw = Number(row.getCell(4).value);
        const participantCount =
          Number.isFinite(totalRaw) && totalRaw > 0
            ? totalRaw
            : participants.length;

        if (!sessionDate || !topic) {
          skipped += 1;
          continue;
        }

        const [result] = await conn.query(
          `
            INSERT INTO training_sessions (
              session_date,
              division_id,
              topic_en,
              topic_cn,
              participant_count
            ) VALUES (?, ?, ?, ?, ?)
          `,
          [sessionDate, divisionId, topic, topic, participantCount]
        );

        const sessionId = Number(result.insertId);
        for (const person of participants) {
          await conn.query(
            `
              INSERT INTO training_session_participants (
                session_id, participant_name_en, participant_name_cn
              ) VALUES (?, ?, ?)
            `,
            [sessionId, person.nameEn, person.nameCn]
          );
          await conn.query(
            `
              INSERT INTO training_participants (name_en, name_cn, is_active)
              VALUES (?, ?, 1)
              ON DUPLICATE KEY UPDATE
                name_cn = VALUES(name_cn),
                is_active = 1
            `,
            [person.nameEn, person.nameCn]
          );
        }

        imported += 1;
      }

      console.log(`Imported sheet ${sheetName} → division ${divisionNameEn}.`);
    }

    console.log(`Done. Imported ${imported} sessions, skipped ${skipped} empty rows.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
