/** One-shot physical corrections for mes_dashboard (not used by new imports). */
export const SEED_BALANCE_EXCEPTIONS = {
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

export function slugLocationCode(name) {
  const slug = String(name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return slug || "LOC";
}

export function normalizeLocationName(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || trimmed === "-") return null;
  if (/^recepcionist$/i.test(trimmed)) return "Receptionist";
  return trimmed;
}

export function splitLocationNames(raw) {
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

/**
 * Seed storage locations + stock balances once (idempotent: skip if any balance exists).
 * @param {import("mysql2/promise").Connection} conn
 * @param {ReturnType<import("./schemaIntrospection.mjs").createSchemaIntrospection>} schema
 */
export async function seedSparepartLocationsAndBalances(conn, schema) {
  const { columnExists, tableExists } = schema;

  const [balanceCountRows] = await conn.query(
    `SELECT COUNT(*) AS c FROM sparepart_stock_balances`,
  );
  const balanceCount = Number(balanceCountRows[0]?.c ?? 0);

  if (balanceCount > 0) {
    console.log("sparepart_stock_balances already seeded; skipping seed.");
    return;
  }

  if (!(await tableExists("sparepart_items"))) {
    return;
  }

  const locationIdByName = new Map();
  const hasLocNameEn = await columnExists("sparepart_storage_locations", "name_en");

  async function ensureLocation(name, { active = true } = {}) {
    const key = name.toLowerCase();
    if (locationIdByName.has(key)) return locationIdByName.get(key);
    const code = slugLocationCode(name);
    const [existing] = await conn.query(
      hasLocNameEn
        ? `SELECT id, name_en AS name FROM sparepart_storage_locations
           WHERE code = ? OR LOWER(name_en) = ? LIMIT 1`
        : `SELECT id, name FROM sparepart_storage_locations
           WHERE code = ? OR LOWER(name) = ? LIMIT 1`,
      [code, key],
    );
    if (existing[0]) {
      locationIdByName.set(key, existing[0].id);
      locationIdByName.set(String(existing[0].name).toLowerCase(), existing[0].id);
      return existing[0].id;
    }
    if (hasLocNameEn) {
      const [ins] = await conn.query(
        `INSERT INTO sparepart_storage_locations (code, name_en, name_cn, is_active)
         VALUES (?, ?, ?, ?)`,
        [code, name, name, active ? 1 : 0],
      );
      locationIdByName.set(key, ins.insertId);
      return ins.insertId;
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
}
