import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { withTransaction } from "@/lib/db";
import type {
  MovementType,
  SparepartGoodsMovementInput,
  SparepartGoodsMovementLineInput,
} from "@/lib/types";

export class SparepartPostingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SparepartPostingError";
    this.status = status;
  }
}

const FORWARD_TYPES: MovementType[] = ["101", "201", "311"];
const REVERSAL_TYPES: MovementType[] = ["102", "202", "312"];

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function isReversalType(t: MovementType): boolean {
  return REVERSAL_TYPES.includes(t);
}

function forwardOfReversal(t: MovementType): MovementType {
  if (t === "102") return "101";
  if (t === "202") return "201";
  if (t === "312") return "311";
  return t;
}

export function parseGoodsMovementBody(
  body: Partial<SparepartGoodsMovementInput>,
): SparepartGoodsMovementInput {
  const movementType = String(body.movement_type ?? "").trim() as MovementType;
  const allowed = [...FORWARD_TYPES, ...REVERSAL_TYPES];
  if (!allowed.includes(movementType)) {
    throw new SparepartPostingError(
      "Movement type must be 101, 201, 311, or reversal 102/202/312.",
    );
  }

  const postingDate = String(body.posting_date ?? "").trim() || todayYmd();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(postingDate)) {
    throw new SparepartPostingError("Posting date must be YYYY-MM-DD.");
  }

  const headerText = String(body.header_text ?? "").trim();
  const recipient = String(body.recipient ?? "").trim();
  const clientRequestId = body.client_request_id
    ? String(body.client_request_id).trim()
    : undefined;
  const reversalOfDocId = body.reversal_of_doc_id
    ? Number(body.reversal_of_doc_id)
    : undefined;

  if (movementType === "201" && !recipient) {
    throw new SparepartPostingError(
      "Recipient / Used by is required for Goods Issue (201).",
    );
  }

  if (isReversalType(movementType)) {
    if (!reversalOfDocId || !Number.isInteger(reversalOfDocId) || reversalOfDocId <= 0) {
      throw new SparepartPostingError(
        "reversal_of_doc_id is required for reversal movements.",
      );
    }
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    if (!isReversalType(movementType)) {
      throw new SparepartPostingError("At least one line item is required.");
    }
  }

  if (Array.isArray(body.lines) && body.lines.length > 10) {
    throw new SparepartPostingError(
      "A document can have at most 10 line items.",
    );
  }

  const lines: SparepartGoodsMovementLineInput[] = (body.lines ?? []).map(
    (line, index) => {
      const itemId = Number(line.item_id);
      const qty = Number(line.qty);
      const note = String(line.note ?? "").trim();
      const storageLocationId = Number(line.storage_location_id);
      const toStorageLocationId =
        line.to_storage_location_id != null
          ? Number(line.to_storage_location_id)
          : undefined;

      if (!Number.isInteger(itemId) || itemId <= 0) {
        throw new SparepartPostingError(`Line ${index + 1}: material is required.`);
      }
      if (!Number.isInteger(qty) || qty <= 0) {
        throw new SparepartPostingError(
          `Line ${index + 1}: quantity must be a positive integer.`,
        );
      }
      if (!Number.isInteger(storageLocationId) || storageLocationId <= 0) {
        throw new SparepartPostingError(
          `Line ${index + 1}: storage location is required.`,
        );
      }
      if (movementType === "311" || movementType === "312") {
        if (
          toStorageLocationId == null ||
          !Number.isInteger(toStorageLocationId) ||
          toStorageLocationId <= 0
        ) {
          throw new SparepartPostingError(
            `Line ${index + 1}: destination storage location is required for transfer.`,
          );
        }
        if (toStorageLocationId === storageLocationId) {
          throw new SparepartPostingError(
            `Line ${index + 1}: from and to storage locations must differ.`,
          );
        }
      }

      return {
        item_id: itemId,
        qty,
        note,
        storage_location_id: storageLocationId,
        to_storage_location_id: toStorageLocationId,
      };
    },
  );

  return {
    movement_type: movementType,
    posting_date: postingDate,
    header_text: headerText,
    recipient:
      movementType === "201" || movementType === "202" ? recipient : "",
    lines,
    created_by: body.created_by ? String(body.created_by).trim() : undefined,
    client_request_id: clientRequestId || undefined,
    reversal_of_doc_id: reversalOfDocId,
  };
}

async function nextDocNumber(
  conn: PoolConnection,
  postingDate: string,
): Promise<string> {
  const ymd = postingDate.replaceAll("-", "");
  const prefix = `MD${ymd}`;
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT doc_number FROM sparepart_mat_docs
     WHERE doc_number LIKE ?
     ORDER BY doc_number DESC
     LIMIT 1
     FOR UPDATE`,
    [`${prefix}%`],
  );
  const last = rows[0]?.doc_number as string | undefined;
  let seq = 1;
  if (last && last.length >= prefix.length + 4) {
    const n = Number(last.slice(prefix.length));
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function loadActiveLocation(
  conn: PoolConnection,
  locationId: number,
  lineNo: number,
): Promise<{ id: number; code: string; name: string }> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id, code, name, is_active FROM sparepart_storage_locations
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [locationId],
  );
  const loc = rows[0] as
    | { id: number; code: string; name: string; is_active: number }
    | undefined;
  if (!loc) {
    throw new SparepartPostingError(
      `Line ${lineNo}: storage location not found.`,
      404,
    );
  }
  if (!loc.is_active) {
    throw new SparepartPostingError(
      `Line ${lineNo}: storage location ${loc.code} is inactive.`,
    );
  }
  return { id: loc.id, code: loc.code, name: loc.name };
}

function locationLabel(loc: { code: string; name: string }): string {
  return `${loc.code} — ${loc.name}`;
}

async function ensureBalanceRow(
  conn: PoolConnection,
  itemId: number,
  locationId: number,
): Promise<number> {
  await conn.query(
    `INSERT INTO sparepart_stock_balances (item_id, storage_location_id, qty)
     VALUES (?, ?, 0)
     ON DUPLICATE KEY UPDATE item_id = item_id`,
    [itemId, locationId],
  );
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id, qty FROM sparepart_stock_balances
     WHERE item_id = ? AND storage_location_id = ?
     LIMIT 1
     FOR UPDATE`,
    [itemId, locationId],
  );
  const bal = rows[0] as { id: number; qty: number } | undefined;
  if (!bal) {
    throw new SparepartPostingError("Failed to lock stock balance.", 500);
  }
  return bal.qty;
}

async function adjustBalance(
  conn: PoolConnection,
  itemId: number,
  locationId: number,
  delta: number,
  lineNo: number,
): Promise<void> {
  const current = await ensureBalanceRow(conn, itemId, locationId);
  if (delta < 0 && current + delta < 0) {
    throw new SparepartPostingError(
      `Line ${lineNo}: insufficient stock at location. Available: ${current}, requested: ${Math.abs(delta)}.`,
    );
  }
  const nextQty = current + delta;
  if (nextQty === 0) {
    await conn.query(
      `DELETE FROM sparepart_stock_balances
       WHERE item_id = ? AND storage_location_id = ?`,
      [itemId, locationId],
    );
    return;
  }
  await conn.query(
    `UPDATE sparepart_stock_balances
     SET qty = ?
     WHERE item_id = ? AND storage_location_id = ?`,
    [nextQty, itemId, locationId],
  );
}

async function syncItemStockCurrent(
  conn: PoolConnection,
  itemId: number,
): Promise<void> {
  await conn.query(
    `UPDATE sparepart_items i
     SET stock_current = (
       SELECT COALESCE(SUM(b.qty), 0)
       FROM sparepart_stock_balances b
       WHERE b.item_id = i.id
     )
     WHERE i.id = ?`,
    [itemId],
  );
}

async function postForwardLines(
  conn: PoolConnection,
  docId: number,
  movementType: MovementType,
  lines: SparepartGoodsMovementLineInput[],
): Promise<void> {
  let lineNo = 0;
  for (const line of lines) {
    lineNo += 1;
    const [items] = await conn.query<RowDataPacket[]>(
      `SELECT id FROM sparepart_items
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE`,
      [line.item_id],
    );
    if (!items[0]) {
      throw new SparepartPostingError(`Line ${lineNo}: material not found.`, 404);
    }

    const fromLoc = await loadActiveLocation(
      conn,
      line.storage_location_id,
      lineNo,
    );
    let toLoc: { id: number; code: string; name: string } | null = null;
    if (movementType === "311" && line.to_storage_location_id) {
      toLoc = await loadActiveLocation(
        conn,
        line.to_storage_location_id,
        lineNo,
      );
    }

    const snapshot =
      movementType === "311" && toLoc
        ? `${locationLabel(fromLoc)} → ${locationLabel(toLoc)}`
        : locationLabel(fromLoc);

    await conn.query(
      `INSERT INTO sparepart_mat_doc_items
        (doc_id, item_id, line_no, qty, storage_location, storage_location_id,
         to_storage_location_id, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docId,
        line.item_id,
        lineNo,
        line.qty,
        snapshot,
        fromLoc.id,
        toLoc?.id ?? null,
        line.note || null,
      ],
    );

    if (movementType === "101") {
      await adjustBalance(conn, line.item_id, fromLoc.id, line.qty, lineNo);
      await conn.query(
        `UPDATE sparepart_items
         SET stock_in = stock_in + ?
         WHERE id = ?`,
        [line.qty, line.item_id],
      );
    } else if (movementType === "201") {
      await adjustBalance(conn, line.item_id, fromLoc.id, -line.qty, lineNo);
      await conn.query(
        `UPDATE sparepart_items
         SET stock_out = stock_out + ?
         WHERE id = ?`,
        [line.qty, line.item_id],
      );
    } else if (movementType === "311" && toLoc) {
      await adjustBalance(conn, line.item_id, fromLoc.id, -line.qty, lineNo);
      await adjustBalance(conn, line.item_id, toLoc.id, line.qty, lineNo);
    }

    await syncItemStockCurrent(conn, line.item_id);
  }
}

async function buildReversalFromDoc(
  conn: PoolConnection,
  originalDocId: number,
  expectedForward: MovementType,
): Promise<{
  originalType: MovementType;
  lines: SparepartGoodsMovementLineInput[];
  recipient: string;
}> {
  const [docs] = await conn.query<RowDataPacket[]>(
    `SELECT id, movement_type, recipient FROM sparepart_mat_docs
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [originalDocId],
  );
  const doc = docs[0] as
    | { id: number; movement_type: MovementType; recipient: string | null }
    | undefined;
  if (!doc) {
    throw new SparepartPostingError("Original document not found.", 404);
  }
  if (doc.movement_type !== expectedForward) {
    throw new SparepartPostingError(
      `Document movement type ${doc.movement_type} cannot be reversed with this reversal type.`,
    );
  }

  const [existing] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM sparepart_mat_docs
     WHERE reversal_of_doc_id = ?
     LIMIT 1`,
    [originalDocId],
  );
  if (existing[0]) {
    throw new SparepartPostingError("This document has already been reversed.");
  }

  const [lines] = await conn.query<RowDataPacket[]>(
    `SELECT item_id, qty, storage_location_id, to_storage_location_id, note
     FROM sparepart_mat_doc_items
     WHERE doc_id = ?
     ORDER BY line_no ASC`,
    [originalDocId],
  );
  if (!lines.length) {
    throw new SparepartPostingError("Original document has no lines.");
  }

  const mapped: SparepartGoodsMovementLineInput[] = [];
  for (const row of lines) {
    const storageLocationId = Number(row.storage_location_id);
    if (!storageLocationId) {
      throw new SparepartPostingError(
        "Cannot reverse: original line missing storage_location_id.",
      );
    }
    mapped.push({
      item_id: Number(row.item_id),
      qty: Number(row.qty),
      note: String(row.note ?? "Reversal"),
      storage_location_id: storageLocationId,
      to_storage_location_id: row.to_storage_location_id
        ? Number(row.to_storage_location_id)
        : undefined,
    });
  }

  return {
    originalType: doc.movement_type,
    lines: mapped,
    recipient: doc.recipient ?? "",
  };
}

async function postReversalLines(
  conn: PoolConnection,
  docId: number,
  reversalType: MovementType,
  lines: SparepartGoodsMovementLineInput[],
): Promise<void> {
  const forward = forwardOfReversal(reversalType);
  let lineNo = 0;
  for (const line of lines) {
    lineNo += 1;
    const [items] = await conn.query<RowDataPacket[]>(
      `SELECT id FROM sparepart_items
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE`,
      [line.item_id],
    );
    if (!items[0]) {
      throw new SparepartPostingError(`Line ${lineNo}: material not found.`, 404);
    }

    const fromLoc = await loadActiveLocation(
      conn,
      line.storage_location_id,
      lineNo,
    );
    let toLoc: { id: number; code: string; name: string } | null = null;
    if (forward === "311" && line.to_storage_location_id) {
      toLoc = await loadActiveLocation(
        conn,
        line.to_storage_location_id,
        lineNo,
      );
    }

    const snapshot =
      forward === "311" && toLoc
        ? `${locationLabel(toLoc)} → ${locationLabel(fromLoc)} (reversal)`
        : `${locationLabel(fromLoc)} (reversal)`;

    await conn.query(
      `INSERT INTO sparepart_mat_doc_items
        (doc_id, item_id, line_no, qty, storage_location, storage_location_id,
         to_storage_location_id, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docId,
        line.item_id,
        lineNo,
        line.qty,
        snapshot,
        // For 312 reverse transfer: stock moves back to_location → from_location
        // Store original from as storage_location_id and original to as to_...
        fromLoc.id,
        toLoc?.id ?? null,
        line.note || null,
      ],
    );

    if (forward === "101") {
      // reverse GR = issue from same location
      await adjustBalance(conn, line.item_id, fromLoc.id, -line.qty, lineNo);
      await conn.query(
        `UPDATE sparepart_items
         SET stock_in = GREATEST(0, stock_in - ?)
         WHERE id = ?`,
        [line.qty, line.item_id],
      );
    } else if (forward === "201") {
      // reverse GI = receipt to same location
      await adjustBalance(conn, line.item_id, fromLoc.id, line.qty, lineNo);
      await conn.query(
        `UPDATE sparepart_items
         SET stock_out = GREATEST(0, stock_out - ?)
         WHERE id = ?`,
        [line.qty, line.item_id],
      );
    } else if (forward === "311" && toLoc) {
      // reverse transfer: move qty from to → from
      await adjustBalance(conn, line.item_id, toLoc.id, -line.qty, lineNo);
      await adjustBalance(conn, line.item_id, fromLoc.id, line.qty, lineNo);
    }

    await syncItemStockCurrent(conn, line.item_id);
  }
}

export async function postGoodsMovement(
  input: SparepartGoodsMovementInput,
): Promise<{ id: number; doc_number: string }> {
  return withTransaction(async (conn) => {
    if (input.client_request_id) {
      const [existing] = await conn.query<RowDataPacket[]>(
        `SELECT id, doc_number FROM sparepart_mat_docs
         WHERE client_request_id = ?
         LIMIT 1`,
        [input.client_request_id],
      );
      if (existing[0]) {
        return {
          id: Number(existing[0].id),
          doc_number: String(existing[0].doc_number),
        };
      }
    }

    let lines = input.lines;
    let recipient = input.recipient;

    if (isReversalType(input.movement_type)) {
      const built = await buildReversalFromDoc(
        conn,
        input.reversal_of_doc_id!,
        forwardOfReversal(input.movement_type),
      );
      lines = built.lines;
      if (!recipient) recipient = built.recipient;
    }

    const docNumber = await nextDocNumber(conn, input.posting_date);

    const [docResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO sparepart_mat_docs
        (doc_number, movement_type, posting_date, header_text, recipient,
         created_by, client_request_id, reversal_of_doc_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docNumber,
        input.movement_type,
        input.posting_date,
        input.header_text || null,
        recipient || null,
        input.created_by || null,
        input.client_request_id || null,
        input.reversal_of_doc_id || null,
      ],
    );
    const docId = docResult.insertId;

    if (isReversalType(input.movement_type)) {
      await postReversalLines(conn, docId, input.movement_type, lines);
    } else {
      await postForwardLines(conn, docId, input.movement_type, lines);
    }

    return { id: docId, doc_number: docNumber };
  });
}

export async function reverseMaterialDocument(
  docId: number,
  opts?: { posting_date?: string; created_by?: string; client_request_id?: string },
): Promise<{ id: number; doc_number: string }> {
  const { query } = await import("@/lib/db");
  const docs = await query<RowDataPacket[]>(
    `SELECT id, doc_number, movement_type FROM sparepart_mat_docs WHERE id = ? LIMIT 1`,
    [docId],
  );
  const doc = docs[0] as
    | { id: number; doc_number: string; movement_type: MovementType }
    | undefined;
  if (!doc) {
    throw new SparepartPostingError("Material document not found.", 404);
  }

  let reversalType: MovementType;
  if (doc.movement_type === "101") reversalType = "102";
  else if (doc.movement_type === "201") reversalType = "202";
  else if (doc.movement_type === "311") reversalType = "312";
  else {
    throw new SparepartPostingError(
      "Only forward documents (101/201/311) can be reversed.",
    );
  }

  return postGoodsMovement({
    movement_type: reversalType,
    posting_date: opts?.posting_date || todayYmd(),
    header_text: `Reversal of document ${doc.doc_number}`,
    recipient: "",
    lines: [],
    created_by: opts?.created_by,
    client_request_id: opts?.client_request_id,
    reversal_of_doc_id: docId,
  });
}
