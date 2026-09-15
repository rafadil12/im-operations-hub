export const MOVEMENT_HISTORY_COLUMNS = [
  "date",
  "doc",
  "line",
  "material",
  "movementType",
  "qty",
  "uom",
  "fromLocation",
  "toLocation",
  "user",
  "note",
] as const;

export type MovementHistoryColumnId = (typeof MOVEMENT_HISTORY_COLUMNS)[number];

export type MovementHistoryColumnVisibility = Record<MovementHistoryColumnId, boolean>;

export const DEFAULT_HISTORY_COLUMN_VISIBILITY: MovementHistoryColumnVisibility =
  Object.fromEntries(MOVEMENT_HISTORY_COLUMNS.map((id) => [id, true])) as MovementHistoryColumnVisibility;

export const HISTORY_COLUMNS_STORAGE_KEY = "sparepart.movementHistory.columns";

export function parseHistoryColumnVisibility(raw: unknown): MovementHistoryColumnVisibility {
  const next = { ...DEFAULT_HISTORY_COLUMN_VISIBILITY };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return next;
  const record = raw as Record<string, unknown>;
  for (const id of MOVEMENT_HISTORY_COLUMNS) {
    if (typeof record[id] === "boolean") next[id] = record[id];
  }
  if (!MOVEMENT_HISTORY_COLUMNS.some((id) => next[id])) {
    return { ...DEFAULT_HISTORY_COLUMN_VISIBILITY };
  }
  return next;
}

export function loadHistoryColumnVisibility(): MovementHistoryColumnVisibility {
  if (typeof window === "undefined") return DEFAULT_HISTORY_COLUMN_VISIBILITY;
  try {
    const raw = window.localStorage.getItem(HISTORY_COLUMNS_STORAGE_KEY);
    if (!raw) return DEFAULT_HISTORY_COLUMN_VISIBILITY;
    return parseHistoryColumnVisibility(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_HISTORY_COLUMN_VISIBILITY;
  }
}

export function saveHistoryColumnVisibility(visibility: MovementHistoryColumnVisibility): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_COLUMNS_STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // Ignore quota / private-mode failures.
  }
}
