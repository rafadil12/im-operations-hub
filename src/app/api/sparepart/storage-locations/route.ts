import { NextRequest, NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { query, withTransaction } from "@/lib/db";
import { slugLocationCode } from "@/lib/sparepartLocations";
import type { SparepartStorageLocation } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const activeOnly = sp.get("active") !== "0";
    const conditions: string[] = [];
    if (activeOnly) conditions.push("is_active = 1");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await query<SparepartStorageLocation[]>(
      `SELECT id, code, name, is_active, created_at, updated_at
       FROM sparepart_storage_locations
       ${where}
       ORDER BY name ASC`,
    );
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/storage-locations failed", error);
    return NextResponse.json(
      { error: "Failed to load storage locations." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: string;
      name?: string;
      is_active?: boolean;
    };
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (name.includes(",")) {
      return NextResponse.json(
        { error: "Location name must not contain commas." },
        { status: 400 },
      );
    }
    const code = String(body.code ?? "").trim() || slugLocationCode(name);
    const isActive = body.is_active === false ? 0 : 1;

    const result = await query<ResultSetHeader>(
      `INSERT INTO sparepart_storage_locations (code, name, is_active)
       VALUES (?, ?, ?)`,
      [code, name, isActive],
    );

    const rows = await query<SparepartStorageLocation[]>(
      `SELECT id, code, name, is_active, created_at, updated_at
       FROM sparepart_storage_locations WHERE id = ? LIMIT 1`,
      [result.insertId],
    );
    return NextResponse.json({ location: rows[0] }, { status: 201 });
  } catch (error) {
    const errno = (error as { errno?: number }).errno;
    if (errno === 1062) {
      return NextResponse.json(
        { error: "Storage location code already exists." },
        { status: 409 },
      );
    }
    console.error("POST /sparepart/storage-locations failed", error);
    return NextResponse.json(
      { error: "Failed to create storage location." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: number;
      code?: string;
      name?: string;
      is_active?: boolean;
    };
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const existing = await query<SparepartStorageLocation[]>(
      `SELECT id, code, name, is_active, created_at, updated_at
       FROM sparepart_storage_locations WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!existing[0]) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const name = body.name != null ? String(body.name).trim() : existing[0].name;
    const code = body.code != null ? String(body.code).trim() : existing[0].code;
    if (!name || !code) {
      return NextResponse.json(
        { error: "code and name are required." },
        { status: 400 },
      );
    }
    if (name.includes(",")) {
      return NextResponse.json(
        { error: "Location name must not contain commas." },
        { status: 400 },
      );
    }

    const nextActive =
      body.is_active === undefined
        ? Number(existing[0].is_active)
        : body.is_active
          ? 1
          : 0;

    if (nextActive === 0 && Number(existing[0].is_active) === 1) {
      const [stock] = await query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(qty), 0) AS total
         FROM sparepart_stock_balances WHERE storage_location_id = ?`,
        [id],
      );
      if (Number(stock?.total ?? 0) !== 0) {
        return NextResponse.json(
          {
            error:
              "Cannot deactivate a storage location that still has non-zero stock.",
          },
          { status: 400 },
        );
      }
    }

    await query(
      `UPDATE sparepart_storage_locations
       SET code = ?, name = ?, is_active = ?
       WHERE id = ?`,
      [code, name, nextActive, id],
    );

    const rows = await query<SparepartStorageLocation[]>(
      `SELECT id, code, name, is_active, created_at, updated_at
       FROM sparepart_storage_locations WHERE id = ? LIMIT 1`,
      [id],
    );
    return NextResponse.json({ location: rows[0] });
  } catch (error) {
    const errno = (error as { errno?: number }).errno;
    if (errno === 1062) {
      return NextResponse.json(
        { error: "Storage location code already exists." },
        { status: 409 },
      );
    }
    console.error("PUT /sparepart/storage-locations failed", error);
    return NextResponse.json(
      { error: "Failed to update storage location." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const id = Number(sp.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    return await withTransaction(async (conn) => {
      const [stockRows] = await conn.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(qty), 0) AS total
         FROM sparepart_stock_balances WHERE storage_location_id = ?`,
        [id],
      );
      if (Number(stockRows[0]?.total ?? 0) !== 0) {
        return NextResponse.json(
          {
            error:
              "Cannot deactivate a storage location that still has non-zero stock.",
          },
          { status: 400 },
        );
      }

      await conn.query(
        `UPDATE sparepart_storage_locations SET is_active = 0 WHERE id = ?`,
        [id],
      );
      return NextResponse.json({ ok: true });
    });
  } catch (error) {
    console.error("DELETE /sparepart/storage-locations failed", error);
    return NextResponse.json(
      { error: "Failed to deactivate storage location." },
      { status: 500 },
    );
  }
}
