import type { SparepartItem } from "@/lib/types";

export type LineDraft = {
  key: string;
  item_id: string;
  qty: string;
  note: string;
  storage_location_id: string;
  storage_level_id: string;
  to_storage_location_id: string;
  to_storage_level_id: string;
  item?: SparepartItem | null;
};

export const MAX_LINES_PER_DOC = 10;

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function todayLocalDateInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function combineDateWithCurrentTime(dateValue: string): string {
  const now = new Date();
  return `${dateValue} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
}

export function newLine(defaultLocId = ""): LineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    item_id: "",
    qty: "1",
    note: "",
    storage_location_id: defaultLocId,
    storage_level_id: "",
    to_storage_location_id: "",
    to_storage_level_id: "",
    item: null,
  };
}

export function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
