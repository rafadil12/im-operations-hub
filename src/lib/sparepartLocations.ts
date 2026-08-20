import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { query } from "@/lib/db";
import type { SparepartStorageLocation } from "@/lib/types";

export function slugLocationCode(name: string): string {
  const slug = String(name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return slug || "LOC";
}

const LOCATION_SELECT = `id, code, name_en, name_cn, is_active, created_at, updated_at`;

/** Resolve location by id, code, or exact EN/CN name. Single string only (no comma-split). */
export async function findStorageLocation(
  conn: PoolConnection | null,
  ref: string | number,
): Promise<SparepartStorageLocation | null> {
  const run = async <T>(sql: string, params: unknown[]) => {
    if (conn) {
      const [rows] = await conn.query<RowDataPacket[]>(sql, params);
      return rows as T;
    }
    return query<T>(sql, params);
  };

  if (typeof ref === "number" || /^\d+$/.test(String(ref))) {
    const id = Number(ref);
    const rows = await run<SparepartStorageLocation[]>(
      `SELECT ${LOCATION_SELECT}
       FROM sparepart_storage_locations WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  const text = String(ref).trim();
  if (!text) return null;

  const rows = await run<SparepartStorageLocation[]>(
    `SELECT ${LOCATION_SELECT}
     FROM sparepart_storage_locations
     WHERE code = ? OR name_en = ? OR name_cn = ?
     LIMIT 1`,
    [text, text, text],
  );
  return rows[0] ?? null;
}

/** Find or create a single (non-comma) location. */
export async function ensureStorageLocation(
  conn: PoolConnection,
  nameOrCode: string,
): Promise<SparepartStorageLocation> {
  const text = String(nameOrCode).trim();
  if (!text || text === "-" || text.includes(",")) {
    throw new Error(
      "Location must be a single storage location name or code (no comma-separated values).",
    );
  }

  const existing = await findStorageLocation(conn, text);
  if (existing) return existing;

  const code = slugLocationCode(text);
  const [byCode] = await conn.query<RowDataPacket[]>(
    `SELECT ${LOCATION_SELECT}
     FROM sparepart_storage_locations WHERE code = ? LIMIT 1`,
    [code],
  );
  if (byCode[0]) return byCode[0] as SparepartStorageLocation;

  const [ins] = await conn.query<ResultSetHeader>(
    `INSERT INTO sparepart_storage_locations (code, name_en, name_cn, is_active)
     VALUES (?, ?, ?, 1)`,
    [code, text, text],
  );
  return {
    id: ins.insertId,
    code,
    name_en: text,
    name_cn: text,
    is_active: 1,
    created_at: null,
    updated_at: null,
  };
}

export async function listActiveStorageLocations(): Promise<
  SparepartStorageLocation[]
> {
  return query<SparepartStorageLocation[]>(
    `SELECT ${LOCATION_SELECT}
     FROM sparepart_storage_locations
     WHERE is_active = 1
     ORDER BY name_en ASC`,
  );
}
