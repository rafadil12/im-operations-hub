import { query } from "@/lib/db";

export function materialCodePrefix(categoryCode: string): string {
  const upper = categoryCode.trim().toUpperCase();
  if (upper === "ASSEMBLY") return "ASM";
  const compact = upper.replace(/[^A-Z0-9]/g, "");
  return compact || "IT";
}

function parseNumericSuffix(code: string, prefix: string): number | null {
  if (!code.toUpperCase().startsWith(prefix.toUpperCase())) return null;
  const suffix = code.slice(prefix.length);
  if (!/^\d+$/.test(suffix)) return null;
  return Number(suffix);
}

export async function nextMaterialCode(categoryId: number): Promise<string> {
  const categories = await query<{ code: string }[]>(
    `SELECT code FROM sparepart_categories WHERE id = ? LIMIT 1`,
    [categoryId]
  );
  const categoryCode = categories[0]?.code;
  if (!categoryCode) {
    throw new Error("Invalid category.");
  }

  const prefix = materialCodePrefix(categoryCode);
  const rows = await query<{ code: string }[]>(
    `SELECT code FROM sparepart_items WHERE code LIKE ?`,
    [`${prefix}%`]
  );

  let max = 0;
  for (const row of rows) {
    const n = parseNumericSuffix(row.code, prefix);
    if (n != null && n > max) max = n;
  }

  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}
