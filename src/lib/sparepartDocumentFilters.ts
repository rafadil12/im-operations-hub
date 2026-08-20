import type { MovementType } from "@/lib/types";

export const MAT_DOC_MOVEMENT_TYPES: MovementType[] = [
  "101",
  "201",
  "311",
  "102",
  "202",
  "312",
];

const MOVEMENT_LABELS: Record<MovementType, string> = {
  "101": "Receive Stock",
  "201": "Issue Stock",
  "311": "Transfer Stock",
  "102": "Reverse Receive",
  "202": "Reverse Issue",
  "312": "Reverse Transfer",
};

export function movementTypeLabel(type: string): string {
  return MOVEMENT_LABELS[type as MovementType] ?? type;
}

export function buildMatDocListFilters(sp: URLSearchParams): {
  where: string;
  params: unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const movementType = sp.get("movementType")?.trim() as MovementType | "";
  if (movementType && MAT_DOC_MOVEMENT_TYPES.includes(movementType)) {
    conditions.push("d.movement_type = ?");
    params.push(movementType);
  }

  const start = sp.get("start");
  const end = sp.get("end");
  if (start) {
    conditions.push("d.posting_date >= ?");
    params.push(`${start} 00:00:00`);
  }
  if (end) {
    conditions.push("d.posting_date <= ?");
    params.push(`${end} 23:59:59`);
  }

  const q = sp.get("q")?.trim();
  if (q) {
    conditions.push(
      `(d.doc_number LIKE ?
          OR d.header_text LIKE ?
          OR d.recipient LIKE ?
          OR EXISTS (
            SELECT 1
            FROM sparepart_mat_doc_items li2
            JOIN sparepart_items i ON i.id = li2.item_id
            WHERE li2.doc_id = d.id
              AND (
                i.code LIKE ?
                OR li2.note LIKE ?
              )
          ))`,
    );
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }

  const location = sp.get("location")?.trim();
  if (location) {
    conditions.push(
      `EXISTS (
          SELECT 1 FROM sparepart_mat_doc_items li2
          LEFT JOIN sparepart_storage_locations loc ON loc.id = li2.storage_location_id
          WHERE li2.doc_id = d.id
            AND (
              li2.storage_location LIKE ?
              OR loc.code = ?
              OR loc.name LIKE ?
            )
        )`,
    );
    const like = `%${location}%`;
    params.push(like, location, like);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}
