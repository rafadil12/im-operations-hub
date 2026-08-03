import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { withTransaction } from "@/lib/db";
import type {
  MovementType,
  SparepartGoodsMovementInput,
} from "@/lib/types";

export class SparepartPostingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SparepartPostingError";
    this.status = status;
  }
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseGoodsMovementBody(
  body: Partial<SparepartGoodsMovementInput>,
): SparepartGoodsMovementInput {
  const movementType = String(body.movement_type ?? "").trim() as MovementType;
  if (movementType !== "101" && movementType !== "201") {
    throw new SparepartPostingError(
      "Movement type must be 101 (Goods Receipt) or 201 (Goods Issue).",
    );
  }

  const postingDate = String(body.posting_date ?? "").trim() || todayYmd();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(postingDate)) {
    throw new SparepartPostingError("Posting date must be YYYY-MM-DD.");
  }

  const headerText = String(body.header_text ?? "").trim();
  const recipient = String(body.recipient ?? "").trim();

  if (movementType === "201" && !recipient) {
    throw new SparepartPostingError(
      "Recipient / Used by is required for Goods Issue (201).",
    );
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    throw new SparepartPostingError("At least one line item is required.");
  }

  const lines = body.lines.map((line, index) => {
    const itemId = Number(line.item_id);
    const qty = Number(line.qty);
    const note = String(line.note ?? "").trim();
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new SparepartPostingError(`Line ${index + 1}: material is required.`);
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new SparepartPostingError(
        `Line ${index + 1}: quantity must be a positive integer.`,
      );
    }
    return { item_id: itemId, qty, note };
  });

  return {
    movement_type: movementType,
    posting_date: postingDate,
    header_text: headerText,
    recipient: movementType === "201" ? recipient : "",
    lines,
    created_by: body.created_by ? String(body.created_by).trim() : undefined,
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

export async function postGoodsMovement(
  input: SparepartGoodsMovementInput,
): Promise<{ id: number; doc_number: string }> {
  return withTransaction(async (conn) => {
    const docNumber = await nextDocNumber(conn, input.posting_date);

    const [docResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO sparepart_mat_docs
        (doc_number, movement_type, posting_date, header_text, recipient, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        docNumber,
        input.movement_type,
        input.posting_date,
        input.header_text || null,
        input.recipient || null,
        input.created_by || null,
      ],
    );
    const docId = docResult.insertId;

    let lineNo = 0;
    for (const line of input.lines) {
      lineNo += 1;
      const [items] = await conn.query<RowDataPacket[]>(
        `SELECT id, location, stock_current FROM sparepart_items
         WHERE id = ? AND deleted_at IS NULL
         LIMIT 1
         FOR UPDATE`,
        [line.item_id],
      );
      const item = items[0] as
        | { id: number; location: string | null; stock_current: number }
        | undefined;
      if (!item) {
        throw new SparepartPostingError(
          `Line ${lineNo}: material not found.`,
          404,
        );
      }

      if (input.movement_type === "201" && item.stock_current < line.qty) {
        throw new SparepartPostingError(
          `Line ${lineNo}: insufficient stock. Available: ${item.stock_current}, requested: ${line.qty}.`,
        );
      }

      await conn.query(
        `INSERT INTO sparepart_mat_doc_items
          (doc_id, item_id, line_no, qty, storage_location, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          docId,
          line.item_id,
          lineNo,
          line.qty,
          item.location,
          line.note || null,
        ],
      );

      if (input.movement_type === "101") {
        await conn.query(
          `UPDATE sparepart_items
           SET stock_in = stock_in + ?, stock_current = stock_current + ?
           WHERE id = ?`,
          [line.qty, line.qty, line.item_id],
        );
      } else {
        await conn.query(
          `UPDATE sparepart_items
           SET stock_out = stock_out + ?, stock_current = stock_current - ?
           WHERE id = ?`,
          [line.qty, line.qty, line.item_id],
        );
      }
    }

    return { id: docId, doc_number: docNumber };
  });
}
