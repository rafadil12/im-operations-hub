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
  const name = trim(body.name);
  const brand = trim(body.brand);
  const model = trim(body.model);
  const location = trim(body.location);
  const notes = trim(body.notes);
  const defaultLoc =
    body.default_storage_location_id != null &&
    body.default_storage_location_id !== ("" as unknown)
      ? Number(body.default_storage_location_id)
      : null;

  const errors: SparepartFieldError[] = [];
  if (!code) errors.push({ field: "code", message: "Code is required." });
  if (!name) errors.push({ field: "name", message: "Name is required." });
  if (code.length > 32) {
    errors.push({ field: "code", message: "Code must be at most 32 characters." });
  }
  if (location.includes(",")) {
    errors.push({
      field: "location",
      message: "Default location must be a single location (no commas).",
    });
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      code,
      name,
      brand,
      model,
      location,
      notes,
      default_storage_location_id:
        defaultLoc != null && Number.isInteger(defaultLoc) && defaultLoc > 0
          ? defaultLoc
          : null,
    },
  };
}
