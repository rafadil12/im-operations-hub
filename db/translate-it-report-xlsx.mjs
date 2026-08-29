/**
 * Fill EN columns in IT REPORT.xlsx from CN columns (in-place).
 *
 * Usage:
 *   node db/translate-it-report-xlsx.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
import { translate } from "@vitalets/google-translate-api";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const INPUT = path.join(root, "IT REPORT.xlsx");
const CACHE_FILE = path.join(__dirname, ".translate-cache.json");
const DELAY_MS = 900;
const MYMEMORY_MAX = 450;
const HAS_CJK = /[\u4e00-\u9fff]/;

const CN_EN_COLS = [
  [2, 3],
  [4, 5],
  [6, 7],
  [8, 9],
  [11, 12],
  [13, 14],
];

const GLOSSARY_EN = {
  周: "Week",
  项目: "Project",
  子项: "Sub-item",
  IT运维: "IT Operations",
  运维: "Operations & maintenance",
  系统运维事件: "System O&M incidents",
  开发事件: "Development",
  需求事件: "Requirements",
  人员培训: "Staff training",
  SOP整理: "SOP documentation",
};

function isValidTranslation(source, translated) {
  const src = cellText(source).trim();
  const out = cellText(translated).trim();
  if (!out) return false;
  if (HAS_CJK.test(src) && HAS_CJK.test(out)) return false;
  return true;
}

function purgeBadCache(cache) {
  for (const [key, value] of Object.entries(cache.en ?? {})) {
    if (!isValidTranslation(key, value)) delete cache.en[key];
  }
}

function loadCache() {
  try {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    cache.en ??= {};
    purgeBadCache(cache);
    return cache;
  } catch {
    return { en: {}, id: {} };
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}

function cellText(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if (value.text) return String(value.text);
    if (value.result != null) return cellText(value.result);
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
  }
  return String(value).trim();
}

function normalizeWeek(text) {
  const trimmed = cellText(text).trim();
  const m = trimmed.match(/^(\d+)\s*周$/);
  return m ? m[1] : null;
}

function glossaryLookup(text) {
  const trimmed = cellText(text).trim();
  if (!trimmed) return "";
  if (GLOSSARY_EN[trimmed]) return GLOSSARY_EN[trimmed];
  const week = trimmed.match(/^(\d+)周$/);
  if (week) return `Week ${week[1]}`;
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitForTranslation(text) {
  if (text.length <= MYMEMORY_MAX) return [text];
  const parts = [];
  let rest = text;
  while (rest.length > MYMEMORY_MAX) {
    let cut = rest.lastIndexOf("\n", MYMEMORY_MAX);
    if (cut < MYMEMORY_MAX * 0.4) cut = rest.lastIndexOf("。", MYMEMORY_MAX);
    if (cut < MYMEMORY_MAX * 0.4) cut = rest.lastIndexOf("，", MYMEMORY_MAX);
    if (cut < MYMEMORY_MAX * 0.4) cut = MYMEMORY_MAX;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts.filter(Boolean);
}

async function translateMyMemory(text) {
  const chunks = splitForTranslation(text);
  const out = [];
  for (const chunk of chunks) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=zh-CN|en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
    const data = await res.json();
    if (data.quotaFinished) throw new Error("MyMemory daily quota exhausted");
    const translated = data?.responseData?.translatedText?.trim();
    if (!translated || data.responseStatus === 429) {
      throw new Error(data.responseDetails || "MyMemory rate limited");
    }
    out.push(translated);
    if (chunks.length > 1) await sleep(400);
  }
  return out.join("\n");
}

async function translateGoogle(text) {
  const { text: translated } = await translate(text, { from: "zh-CN", to: "en" });
  return translated?.trim() ?? "";
}

async function translateOne(text, cache, attempt = 1) {
  const trimmed = cellText(text).trim();
  if (!trimmed) return "";

  const fromGlossary = glossaryLookup(trimmed);
  if (fromGlossary) return fromGlossary;

  const cached = cache.en[trimmed];
  if (cached && isValidTranslation(trimmed, cached)) return cached;

  try {
    await sleep(DELAY_MS);
    const translated = await translateMyMemory(trimmed);
    if (isValidTranslation(trimmed, translated)) {
      cache.en[trimmed] = translated;
      return translated;
    }
    throw new Error("MyMemory returned untranslated text");
  } catch (primaryErr) {
    try {
      await sleep(DELAY_MS);
      const translated = await translateGoogle(trimmed);
      if (isValidTranslation(trimmed, translated)) {
        cache.en[trimmed] = translated;
        return translated;
      }
      throw new Error("Google returned untranslated text");
    } catch (err) {
      if (/too many requests/i.test(String(err.message)) && attempt < 4) {
        const backoff = 8000 * attempt;
        console.warn(`Rate limited, wait ${backoff}ms, retry ${attempt}/3…`);
        await sleep(backoff);
        return translateOne(text, cache, attempt + 1);
      }
      console.warn(`Failed: ${trimmed.slice(0, 50)}… (${primaryErr.message})`);
      return trimmed;
    }
  }
}

function lookup(text, cache) {
  const trimmed = cellText(text).trim();
  if (!trimmed) return "";
  const weekNum = normalizeWeek(trimmed);
  if (weekNum) return `Week ${weekNum}`;
  return glossaryLookup(trimmed) ?? cache.en[trimmed] ?? trimmed;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(INPUT);
  const cache = loadCache();
  const pending = new Set();

  for (const sheet of wb.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row, rn) => {
      if (rn === 1) return;
      for (const [cnCol, enCol] of CN_EN_COLS) {
        const cn = cellText(row.getCell(cnCol).value).trim();
        const en = cellText(row.getCell(enCol).value).trim();
        if (cn && !en && !glossaryLookup(cn) && !normalizeWeek(cn)) pending.add(cn);
      }
    });
  }

  const needsTranslate = (t) => !cache.en[t] || !isValidTranslation(t, cache.en[t]);
  const todo = [...pending].filter(needsTranslate);
  console.log(`File: ${INPUT}`);
  console.log(`Unique CN strings to translate: ${todo.length} (${pending.size} total unique)`);

  let done = 0;
  for (const text of todo) {
    cache.en[text] = await translateOne(text, cache);
    saveCache(cache);
    done += 1;
    if (done % 10 === 0) console.log(`  translated ${done}/${todo.length}…`);
  }

  let filled = 0;
  for (const sheet of wb.worksheets) {
    for (let rn = 2; rn <= sheet.rowCount; rn++) {
      const row = sheet.getRow(rn);
      for (const [cnCol, enCol] of CN_EN_COLS) {
        const cn = cellText(row.getCell(cnCol).value).trim();
        const en = cellText(row.getCell(enCol).value).trim();
        if (cn && !en) {
          row.getCell(enCol).value = lookup(cn, cache);
          filled += 1;
        }
      }
    }
  }

  try {
    await wb.xlsx.writeFile(INPUT);
  } catch (err) {
    if (err.code === "EBUSY") {
      const alt = INPUT.replace(/\.xlsx$/i, "-translated.xlsx");
      console.warn(`File locked, writing to ${alt}`);
      await wb.xlsx.writeFile(alt);
    } else {
      throw err;
    }
  }
  saveCache(cache);
  console.log(`\nFilled ${filled} EN cells → ${INPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
