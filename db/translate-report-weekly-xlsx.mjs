/**
 * Translate (REPORT)周报事项汇总表.xlsx → bilingual Excel (EN + ID).
 * Deduplicates strings and persists cache to avoid repeat API calls.
 *
 * Usage:
 *   node db/translate-report-weekly-xlsx.mjs
 *   node db/translate-report-weekly-xlsx.mjs --en-only
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
import { translate } from "@vitalets/google-translate-api";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const INPUT = path.join(root, "(REPORT)周报事项汇总表.xlsx");
const OUTPUT = path.join(root, "(REPORT)Weekly-Report-Summary-EN-ID.xlsx");
const CACHE_FILE = path.join(__dirname, ".translate-cache.json");
const enOnly = process.argv.includes("--en-only");
const DELAY_MS = enOnly ? 900 : 1200;
const MYMEMORY_MAX = 450;
const HAS_CJK = /[\u4e00-\u9fff]/;

const GLOSSARY_EN = {
  周: "Week",
  项目: "Project",
  子项: "Sub-item",
  考核目标: "Assessment target",
  累计完成情况: "Cumulative completion",
  上周总结: "Last week summary",
  下周计划: "Next week plan",
  "MOM项": "MOM",
  IT运维: "IT Operations",
  智能物流: "Smart Logistics",
  安全员: "Safety Officer",
  追溯: "Traceability",
  数据采集: "Data collection",
  系统运维事件: "System O&M incidents",
  开发事件: "Development",
  需求事件: "Requirements",
  运维: "Operations & maintenance",
  人员培训: "Staff training",
  SOP整理: "SOP documentation",
  安全生产责任考核: "Safety responsibility assessment",
  月末安全报告: "End-of-month safety report",
};

const GLOSSARY_ID = {
  周: "Minggu",
  项目: "Proyek",
  子项: "Sub-kategori",
  考核目标: "Target penilaian",
  累计完成情况: "Penyelesaian kumulatif",
  上周总结: "Ringkasan minggu lalu",
  下周计划: "Rencana minggu depan",
  "MOM项": "MOM",
  IT运维: "Operasi IT",
  智能物流: "Logistik Cerdas",
  安全员: "Petugas Keselamatan",
  追溯: "Traceability / Pelacakan",
  数据采集: "Pengumpulan data",
  系统运维事件: "Insiden pemeliharaan sistem",
  开发事件: "Pengembangan",
  需求事件: "Kebutuhan / Permintaan",
  运维: "Operasi & pemeliharaan",
  人员培训: "Pelatihan staf",
  SOP整理: "Penyusunan SOP",
  安全生产责任考核: "Penilaian tanggung jawab keselamatan",
  月末安全报告: "Laporan keselamatan akhir bulan",
};

const HEADERS = [
  "Week (CN)",
  "Week (EN)",
  "Week (ID)",
  "Project (CN)",
  "Project (EN)",
  "Project (ID)",
  "Sub-item (CN)",
  "Sub-item (EN)",
  "Sub-item (ID)",
  "Target (CN)",
  "Target (EN)",
  "Target (ID)",
  "Completion rate",
  "Summary (CN)",
  "Summary (EN)",
  "Summary (ID)",
  "Plan (CN)",
  "Plan (EN)",
  "Plan (ID)",
];

function isValidTranslation(source, lang, translated) {
  const src = cellText(source).trim();
  const out = cellText(translated).trim();
  if (!out) return false;
  if (lang === "en" && HAS_CJK.test(src) && HAS_CJK.test(out)) return false;
  if (lang === "id" && out === src && HAS_CJK.test(src)) return false;
  return true;
}

function purgeBadCache(cache) {
  for (const lang of ["en", "id"]) {
    for (const [key, value] of Object.entries(cache[lang] ?? {})) {
      if (!isValidTranslation(key, lang, value)) delete cache[lang][key];
    }
  }
}

function loadCache() {
  try {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    cache.en ??= {};
    cache.id ??= {};
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

function glossaryLookup(text, glossary) {
  const trimmed = cellText(text).trim();
  if (!trimmed) return "";
  if (glossary[trimmed]) return glossary[trimmed];
  const week = trimmed.match(/^(\d+)周$/);
  if (week) {
    return glossary["周"] === "Week" ? `Week ${week[1]}` : `Minggu ${week[1]}`;
  }
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

async function translateMyMemory(text, lang) {
  const to = lang === "en" ? "en" : "id";
  const chunks = splitForTranslation(text);
  const out = [];
  for (const chunk of chunks) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=zh-CN|${to}`;
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

async function translateGoogle(text, lang) {
  const to = lang === "en" ? "en" : "id";
  const { text: translated } = await translate(text, { from: "zh-CN", to });
  return translated?.trim() ?? "";
}

async function translateOne(text, lang, cache, attempt = 1) {
  const trimmed = cellText(text).trim();
  if (!trimmed) return "";

  const glossary = lang === "en" ? GLOSSARY_EN : GLOSSARY_ID;
  const fromGlossary = glossaryLookup(trimmed, glossary);
  if (fromGlossary) return fromGlossary;

  const cached = cache[lang][trimmed];
  if (cached && isValidTranslation(trimmed, lang, cached)) return cached;

  try {
    await sleep(DELAY_MS);
    const translated = await translateMyMemory(trimmed, lang);
    if (isValidTranslation(trimmed, lang, translated)) {
      cache[lang][trimmed] = translated;
      return translated;
    }
    throw new Error("MyMemory returned untranslated text");
  } catch (primaryErr) {
    try {
      await sleep(DELAY_MS);
      const translated = await translateGoogle(trimmed, lang);
      if (isValidTranslation(trimmed, lang, translated)) {
        cache[lang][trimmed] = translated;
        return translated;
      }
      throw new Error("Google returned untranslated text");
    } catch (err) {
      if (/too many requests/i.test(String(err.message)) && attempt < 4) {
        const backoff = 8000 * attempt;
        console.warn(`Rate limited (${lang}), wait ${backoff}ms, retry ${attempt}/3…`);
        await sleep(backoff);
        return translateOne(text, lang, cache, attempt + 1);
      }
      console.warn(`Failed (${lang}): ${trimmed.slice(0, 40)}… (${primaryErr.message})`);
      return trimmed;
    }
  }
}

function isHeaderRow(values) {
  const project = cellText(values[1]).trim();
  const sub = cellText(values[2]).trim();
  return project === "项目" || sub === "子项";
}

function styleHeader(sheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns = HEADERS.map((h) => ({
    header: h,
    width: h.includes("Summary") || h.includes("Target") || h.includes("Plan") ? 36 : 18,
  }));
}

function lookup(text, lang, cache) {
  const trimmed = cellText(text).trim();
  if (!trimmed) return "";
  const weekNum = normalizeWeek(trimmed);
  if (weekNum && (lang === "en" || lang === "id")) {
    return lang === "en" ? `Week ${weekNum}` : `Minggu ${weekNum}`;
  }
  const glossary = lang === "en" ? GLOSSARY_EN : GLOSSARY_ID;
  return glossaryLookup(trimmed, glossary) ?? cache[lang][trimmed] ?? trimmed;
}

function buildRow(values, cache) {
  const [week, project, sub, target, rate, summary, plan] = values;
  return [
    cellText(week).trim(),
    lookup(week, "en", cache),
    lookup(week, "id", cache),
    cellText(project).trim(),
    lookup(project, "en", cache),
    lookup(project, "id", cache),
    cellText(sub).trim(),
    lookup(sub, "en", cache),
    lookup(sub, "id", cache),
    cellText(target).trim(),
    lookup(target, "en", cache),
    lookup(target, "id", cache),
    rate,
    cellText(summary).trim(),
    lookup(summary, "en", cache),
    lookup(summary, "id", cache),
    cellText(plan).trim(),
    lookup(plan, "en", cache),
    lookup(plan, "id", cache),
  ];
}

async function main() {
  const wbIn = new ExcelJS.Workbook();
  await wbIn.xlsx.readFile(INPUT);

  const cache = loadCache();
  const pending = new Set();

  for (const sheet of wbIn.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row, rn) => {
      if (rn === 1) return;
      const values = [1, 2, 3, 4, 6, 7].map((c) => cellText(row.getCell(c).value).trim());
      if (isHeaderRow([null, values[1], values[2]])) return;
      for (const t of values) {
        if (!t) continue;
        if (!glossaryLookup(t, GLOSSARY_EN) && !normalizeWeek(t)) pending.add(t);
      }
    });
  }

  const needsLang = (t, lang) => !cache[lang][t] || !isValidTranslation(t, lang, cache[lang][t]);
  const todo = [...pending].filter((t) => needsLang(t, "en") || (!enOnly && needsLang(t, "id")));
  console.log(`Sheets: ${wbIn.worksheets.map((s) => s.name).join(", ")}`);
  console.log(
    `Mode: ${enOnly ? "EN only" : "EN + ID"}, unique strings: ${pending.size}, to translate: ${todo.length}`
  );

  let done = 0;
  for (const text of todo) {
    if (needsLang(text, "en")) {
      cache.en[text] = await translateOne(text, "en", cache);
      saveCache(cache);
    }
    if (!enOnly && needsLang(text, "id")) {
      cache.id[text] = await translateOne(text, "id", cache);
      saveCache(cache);
    }
    done += 1;
    if (done % 20 === 0) console.log(`  translated ${done}/${todo.length} unique strings…`);
  }

  const wbOut = new ExcelJS.Workbook();
  wbOut.creator = "im-operations-hub";
  wbOut.created = new Date();
  let rows = 0;

  for (const sheetIn of wbIn.worksheets) {
    const sheetOut = wbOut.addWorksheet(sheetIn.name.slice(0, 31));
    sheetOut.addRow(HEADERS);
    styleHeader(sheetOut);

    for (let rn = 2; rn <= sheetIn.rowCount; rn++) {
      const row = sheetIn.getRow(rn);
      const values = [1, 2, 3, 4, 5, 6, 7].map((c) => row.getCell(c).value);
      const hasData = values.some((v) => cellText(v).trim());
      if (!hasData) continue;
      if (isHeaderRow(values)) continue;

      const outRow = sheetOut.addRow(buildRow(values, cache));
      outRow.alignment = { vertical: "top", wrapText: true };
      rows += 1;
    }
    console.log(`  ${sheetIn.name}: done`);
  }

  try {
    await wbOut.xlsx.writeFile(OUTPUT);
  } catch (err) {
    if (err.code === "EBUSY") {
      const alt = OUTPUT.replace(/\.xlsx$/i, "-copy.xlsx");
      console.warn(`File locked, writing to ${alt}`);
      await wbOut.xlsx.writeFile(alt);
    } else {
      throw err;
    }
  }
  saveCache(cache);
  console.log(`\nWritten ${rows} rows → ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
