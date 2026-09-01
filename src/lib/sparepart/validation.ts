import type { SparepartItemInput } from "@/lib/types";

export type SparepartFieldError = {
  field: string;
  message: string;
};

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseMinStock(value: unknown): number | null {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

function parseCategoryId(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

function parseIsActive(value: unknown): boolean {
  if (value === false || value === 0 || value === "0" || value === "false") {
    return false;
  }
  return true;
}

export function parseSparepartItemBody(
  body: Partial<SparepartItemInput>
): { ok: true; data: SparepartItemInput } | { ok: false; errors: SparepartFieldError[] } {
  const code = trim(body.code);
  const name_en = trim(body.name_en);
  const name_cn = trim(body.name_cn);
  const brand_en = trim(body.brand_en);
  const brand_cn = trim(body.brand_cn);
  const model = trim(body.model);
  const notes = trim(body.notes);
  const category_id = parseCategoryId(body.category_id);
  const uom_id = parseCategoryId(body.uom_id);
  const min_stock = parseMinStock(body.min_stock);
  const is_active = parseIsActive(body.is_active);

  const errors: SparepartFieldError[] = [];
  if (!code) errors.push({ field: "code", message: "Code is required." });
  if (!name_en && !name_cn) {
    errors.push({
      field: "name_en",
      message: "At least one description (EN or CN) is required.",
    });
  }
  if (code.length > 32) {
    errors.push({ field: "code", message: "Code must be at most 32 characters." });
  }
  if (category_id == null) {
    errors.push({ field: "category_id", message: "Category is required." });
  }
  if (uom_id == null) {
    errors.push({ field: "uom_id", message: "UoM is required." });
  }
  if (min_stock == null) {
    errors.push({
      field: "min_stock",
      message: "Min stock must be an integer of 0 or more.",
    });
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      code,
      name_en,
      name_cn,
      brand_en,
      brand_cn,
      model,
      notes,
      category_id: category_id as number,
      uom_id: uom_id as number,
      min_stock: min_stock as number,
      is_active,
    },
  };
}
