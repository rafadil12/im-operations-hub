// One-shot: re-prefix and compact sparepart material codes inside the
// categories you name. Stock, material documents, and daily-operation
// rows stay put — they reference item_id, not the code text.
//
// Usage:
//   node --env-file=.env.test.local db/renumber-material-codes.mjs --categories AGV,DTR
//   node --env-file=.env.test.local db/renumber-material-codes.mjs --categories AGV,DTR --apply
//
// Without --apply the script only prints the mapping.
// Prefix matches materialCodePrefix in src/lib/sparepart/materialCode.ts.
// A second run is a no-op once every standard code already matches its target.

import mysql from "mysql2/promise";

const STANDARD_CODE = /^[A-Z]+\d{5}$/;

function materialCodePrefix(categoryCode) {
  const upper = categoryCode.trim().toUpperCase();
  if (upper === "ASSEMBLY") return "ASM";
  const compact = upper.replace(/[^A-Z0-9]/g, "");
  return compact || "IT";
}

function parseArgs(argv) {
  let apply = false;
  let categoriesArg = null;
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") {
      apply = true;
    } else if (arg === "--categories") {
      categoriesArg = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--categories=")) {
      categoriesArg = arg.slice("--categories=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node --env-file=.env.test.local db/renumber-material-codes.mjs --categories AGV,DTR [--apply]"
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!categoriesArg || !categoriesArg.trim()) {
    throw new Error(
      "Missing --categories. Example: --categories AGV,DTR"
    );
  }
  const codes = [
    ...new Set(
      categoriesArg
        .split(",")
        .map((part) => part.trim().toUpperCase())
        .filter(Boolean)
    ),
  ];
  if (codes.length === 0) {
    throw new Error("No categories given.");
  }
  return { apply, codes };
}

function codeParts(code) {
  const match = code.match(/^([A-Z]+)(\d{5})$/);
  if (!match) return null;
  return { prefix: match[1], n: Number(match[2]) };
}

function formatCode(prefix, n) {
  return `${prefix}${String(n).padStart(5, "0")}`;
}

function compareItems(a, b) {
  const aDeleted = a.deleted_at != null ? 1 : 0;
  const bDeleted = b.deleted_at != null ? 1 : 0;
  if (aDeleted !== bDeleted) return aDeleted - bDeleted;
  const aParts = codeParts(a.code);
  const bParts = codeParts(b.code);
  if (aParts.prefix !== bParts.prefix) {
    return aParts.prefix < bParts.prefix ? -1 : 1;
  }
  return aParts.n - bParts.n;
}

function planCategory(items, prefix) {
  const standard = items.filter((item) => STANDARD_CODE.test(item.code));
  const skipped = items.filter((item) => !STANDARD_CODE.test(item.code));
  standard.sort(compareItems);
  const rows = standard.map((item, index) => {
    const newCode = formatCode(prefix, index + 1);
    return {
      id: item.id,
      oldCode: item.code,
      newCode,
      deleted: item.deleted_at != null,
      changed: item.code !== newCode,
    };
  });
  return { rows, skipped };
}

function assertPlanIsCompact(categoryCode, prefix, rows) {
  rows.forEach((row, index) => {
    const expected = formatCode(prefix, index + 1);
    if (row.newCode !== expected) {
      throw new Error(
        `${categoryCode} target ${row.newCode} is not ${expected}.`
      );
    }
  });
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.newCode)) {
      throw new Error(`${categoryCode} plans duplicate code ${row.newCode}.`);
    }
    seen.add(row.newCode);
    if (row.newCode.length > 32) {
      throw new Error(`${categoryCode} code ${row.newCode} exceeds 32 characters.`);
    }
  }
}

function assertNoExternalCollision(allCodes, changes) {
  const changingIds = new Set(changes.map((row) => row.id));
  const finalById = new Map(allCodes.map((row) => [row.id, row.code]));
  for (const change of changes) {
    finalById.set(change.id, change.newCode);
  }
  const owner = new Map();
  for (const [id, code] of finalById) {
    if (owner.has(code)) {
      throw new Error(
        `Code ${code} would belong to items ${owner.get(code)} and ${id}.`
      );
    }
    owner.set(code, id);
  }
  for (const change of changes) {
    const temp = `TMP-${change.id}`;
    if (owner.has(temp) && !changingIds.has(owner.get(temp))) {
      throw new Error(`Temporary code ${temp} is already in use.`);
    }
    if ([...finalById.values()].includes(temp)) {
      throw new Error(`Temporary code ${temp} clashes with a final code.`);
    }
  }
}

function printPlan(categoryCode, prefix, rows, skipped) {
  const changes = rows.filter((row) => row.changed);
  const unchanged = rows.length - changes.length;
  console.log(
    `\n${categoryCode} prefix ${prefix}: ${changes.length} change(s), ${unchanged} already correct, ${skipped.length} non-standard skipped`
  );
  for (const row of skipped) {
    console.log(`  skip ${row.code} (id ${row.id})`);
  }
  for (const row of changes) {
    const deleted = row.deleted ? " deleted" : "";
    console.log(`  ${row.oldCode} -> ${row.newCode}${deleted} (id ${row.id})`);
  }
}

async function verifyCategory(conn, categoryCode, prefix) {
  const [rows] = await conn.query(
    `SELECT i.code
     FROM sparepart_items i
     JOIN sparepart_categories c ON c.id = i.category_id
     WHERE c.code = ?`,
    [categoryCode]
  );
  const numbers = [];
  for (const row of rows) {
    if (!STANDARD_CODE.test(row.code)) continue;
    const parts = codeParts(row.code);
    if (parts.prefix !== prefix) {
      throw new Error(`${categoryCode} still has ${row.code}.`);
    }
    numbers.push(parts.n);
  }
  numbers.sort((a, b) => a - b);
  const unique = new Set(numbers);
  if (unique.size !== numbers.length) {
    throw new Error(`${categoryCode} has duplicate codes.`);
  }
  for (let i = 0; i < numbers.length; i += 1) {
    if (numbers[i] !== i + 1) {
      throw new Error(
        `${categoryCode} has a gap at ${formatCode(prefix, i + 1)} (found ${numbers[i]}).`
      );
    }
  }
  return numbers.length;
}

async function applyChanges(conn, changes) {
  if (changes.length === 0) return;
  const ids = changes.map((row) => row.id);
  const [locked] = await conn.query(
    "SELECT id, code FROM sparepart_items WHERE id IN (?) FOR UPDATE",
    [ids]
  );
  if (locked.length !== changes.length) {
    throw new Error("A planned item disappeared before apply.");
  }
  const lockedCode = new Map(locked.map((row) => [row.id, row.code]));
  for (const change of changes) {
    if (lockedCode.get(change.id) !== change.oldCode) {
      throw new Error(
        `Item ${change.id} code changed from ${change.oldCode} to ${lockedCode.get(change.id)} before apply.`
      );
    }
  }

  const targets = changes.map((row) => row.newCode);
  const [occupied] = await conn.query(
    "SELECT id, code FROM sparepart_items WHERE code IN (?) FOR UPDATE",
    [targets]
  );
  const changingIds = new Set(ids);
  for (const row of occupied) {
    if (!changingIds.has(row.id)) {
      throw new Error(
        `Target code ${row.code} is held by item ${row.id}, which this run does not move.`
      );
    }
  }

  const temps = changes.map((row) => `TMP-${row.id}`);
  const [tempHits] = await conn.query(
    "SELECT id, code FROM sparepart_items WHERE code IN (?)",
    [temps]
  );
  if (tempHits.length > 0) {
    throw new Error(
      `Temporary code ${tempHits[0].code} is already used by item ${tempHits[0].id}.`
    );
  }

  for (const change of changes) {
    await conn.query("UPDATE sparepart_items SET code = ? WHERE id = ?", [
      `TMP-${change.id}`,
      change.id,
    ]);
  }
  for (const change of changes) {
    await conn.query("UPDATE sparepart_items SET code = ? WHERE id = ?", [
      change.newCode,
      change.id,
    ]);
  }
}

async function main() {
  const { apply, codes } = parseArgs(process.argv);
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false,
  });

  try {
    console.log(`DB ${process.env.DB_NAME ?? "(unset)"}`);
    console.log(apply ? "mode apply" : "mode dry-run");

    const [categories] = await conn.query(
      "SELECT id, code FROM sparepart_categories WHERE code IN (?)",
      [codes]
    );
    const byCode = new Map(categories.map((row) => [row.code, row]));
    const missing = codes.filter((code) => !byCode.has(code));
    if (missing.length > 0) {
      throw new Error(`Unknown category code: ${missing.join(", ")}.`);
    }

    const plans = [];
    for (const code of codes) {
      const category = byCode.get(code);
      const prefix = materialCodePrefix(category.code);
      const [items] = await conn.query(
        "SELECT id, code, deleted_at FROM sparepart_items WHERE category_id = ?",
        [category.id]
      );
      const plan = planCategory(items, prefix);
      assertPlanIsCompact(code, prefix, plan.rows);
      plans.push({ code, prefix, ...plan });
      printPlan(code, prefix, plan.rows, plan.skipped);
    }

    const changes = plans.flatMap((plan) =>
      plan.rows.filter((row) => row.changed)
    );
    const [allCodes] = await conn.query(
      "SELECT id, code FROM sparepart_items"
    );
    assertNoExternalCollision(allCodes, changes);

    const [[{ balanceCount }]] = await conn.query(
      "SELECT COUNT(*) AS balanceCount FROM sparepart_stock_balances"
    );
    console.log(`\nstock balance rows before: ${balanceCount}`);
    console.log(`rows to update: ${changes.length}`);

    if (!apply) {
      console.log("\nDry run only. Re-run with --apply to write.");
      return;
    }

    await conn.beginTransaction();
    try {
      await applyChanges(conn, changes);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    }

    for (const plan of plans) {
      const count = await verifyCategory(conn, plan.code, plan.prefix);
      console.log(`verified ${plan.code}: ${count} standard code(s), no gaps`);
    }
    const [[{ balanceCountAfter }]] = await conn.query(
      "SELECT COUNT(*) AS balanceCountAfter FROM sparepart_stock_balances"
    );
    console.log(`stock balance rows after: ${balanceCountAfter}`);
    if (Number(balanceCountAfter) !== Number(balanceCount)) {
      throw new Error(
        `Stock balance count changed from ${balanceCount} to ${balanceCountAfter}.`
      );
    }
    console.log("\nApplied.");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
