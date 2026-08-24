export const DEFAULT_UOM_CODE = "PCS";

export const UOM_CODES = ["PCS", "PACK", "ROLL", "MTR"] as const;

export type UomCode = (typeof UOM_CODES)[number];

export function normalizeUomCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  if (!code) return null;
  if (code === "PC" || code === "PCS" || code === "PIECE" || code === "PIECES") {
    return "PCS";
  }
  if (code === "PK" || code === "PACK" || code === "PACKET") return "PACK";
  if (code === "ROLL" || code === "ROL") return "ROLL";
  if (code === "M" || code === "MTR" || code === "METER" || code === "METRE") {
    return "MTR";
  }
  return code;
}
