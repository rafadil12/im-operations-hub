export type SummaryColumnId =
  | "week"
  | "area"
  | "subItem"
  | "target"
  | "completion"
  | "summary"
  | "plan";

export const SUMMARY_COLUMNS: SummaryColumnId[] = [
  "week",
  "area",
  "subItem",
  "target",
  "completion",
  "summary",
  "plan",
];

export const STICKY_SUMMARY_COLUMNS = new Set<SummaryColumnId>(["week", "area"]);

export const DEFAULT_COLUMN_WIDTHS: Record<SummaryColumnId, number> = {
  week: 88,
  area: 110,
  subItem: 140,
  target: 180,
  completion: 88,
  summary: 320,
  plan: 200,
};

export const DEFAULT_COLUMN_VISIBILITY: Record<SummaryColumnId, boolean> = {
  week: true,
  area: true,
  subItem: true,
  target: true,
  completion: true,
  summary: true,
  plan: true,
};

export const COLUMN_WIDTHS_STORAGE_KEY = "report-summary-column-widths";
export const COLUMN_VISIBILITY_STORAGE_KEY = "report-summary-column-visibility";

export const MIN_RESIZABLE_WIDTH = 72;

export function loadColumnWidths(): Record<SummaryColumnId, number> {
  if (typeof window === "undefined") return { ...DEFAULT_COLUMN_WIDTHS };
  try {
    const raw = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COLUMN_WIDTHS };
    const parsed = JSON.parse(raw) as Partial<Record<SummaryColumnId, number>>;
    return { ...DEFAULT_COLUMN_WIDTHS, ...parsed };
  } catch {
    return { ...DEFAULT_COLUMN_WIDTHS };
  }
}

export function saveColumnWidths(widths: Record<SummaryColumnId, number>) {
  localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(widths));
}

export function loadColumnVisibility(): Record<SummaryColumnId, boolean> {
  if (typeof window === "undefined") return { ...DEFAULT_COLUMN_VISIBILITY };
  try {
    const raw = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COLUMN_VISIBILITY };
    const parsed = JSON.parse(raw) as Partial<Record<SummaryColumnId, boolean>>;
    return { ...DEFAULT_COLUMN_VISIBILITY, ...parsed };
  } catch {
    return { ...DEFAULT_COLUMN_VISIBILITY };
  }
}

export function saveColumnVisibility(visibility: Record<SummaryColumnId, boolean>) {
  localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
}

export function stickyLeftOffset(
  columnId: SummaryColumnId,
  widths: Record<SummaryColumnId, number>,
  visibility: Record<SummaryColumnId, boolean>
): number | null {
  if (!STICKY_SUMMARY_COLUMNS.has(columnId) || !visibility[columnId]) return null;

  let offset = 0;
  for (const col of SUMMARY_COLUMNS) {
    if (col === columnId) return offset;
    if (visibility[col] && STICKY_SUMMARY_COLUMNS.has(col)) {
      offset += widths[col];
    }
  }
  return offset;
}
