import type { SparepartItemInput } from "@/lib/types";

export type SparepartFieldError = {
  field: string;
  message: string;
};

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseSparepartItemBody(
  body: Partial<SparepartItemInput>,
):
  | { ok: true; data: SparepartItemInput }
  | { ok: false; errors: SparepartFieldError[] } {
  const code = trim(body.code);
  const name_en = trim(body.name_en);
  const name_cn = trim(body.name_cn);
  const brand_en = trim(body.brand_en);
  const brand_cn = trim(body.brand_cn);
  const model = trim(body.model);
  const notes = trim(body.notes);

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
    },
  };
}
