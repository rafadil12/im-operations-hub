import type { ReportSubItem } from "./types";
import {
  MAX_WEEK_REPORT_LINES,
  newWeekLineDraft,
  type ReportWeekLineDraft,
} from "./weekFormDraft";

export const GRID_COLUMN_KEYS = [
  "subItem",
  "completion",
  "targetEn",
  "targetCn",
  "summaryEn",
  "summaryCn",
  "planEn",
  "planCn",
] as const;

export type GridColumnKey = (typeof GRID_COLUMN_KEYS)[number];

export type GridCellRef = {
  row: number;
  col: number;
};

export type MatchableSubItem = Pick<ReportSubItem, "id" | "nameEn" | "nameCn">;

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const HEADER_CELL_MARKERS = new Set([
  "sub-item",
  "subitem",
  "sub item",
  "子项",
  "completion",
  "完成度",
  "累计完成情况",
  "target",
  "target (en)",
  "target (cn)",
  "考核目标",
  "summary",
  "last week's summary",
  "上周总结",
  "plan",
  "next week's plan",
  "下周计划",
]);

function isHeaderRow(row: string[]): boolean {
  if (!row.length) return false;
  const first = normalizeLabel(row[0] ?? "");
  if (!first) return false;
  return HEADER_CELL_MARKERS.has(first);
}

/**
 * Split clipboard TSV into a 2D grid (RFC-4180-style quotes).
 * Newlines and tabs inside `"..."` stay inside the cell; `""` becomes `"`.
 * Drops trailing empty rows. Drops a leading header row when it looks like Sub-item / 子项.
 */
export function parseClipboardGrid(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    // Ignore a completely empty trailing row from a final newline.
    if (row.length === 1 && row[0] === "" && rows.length > 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  while (i < normalized.length) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === "\t") {
      pushCell();
      i += 1;
      continue;
    }
    if (ch === "\n") {
      pushCell();
      pushRow();
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }

  // Final cell/row (no trailing newline).
  if (cell.length > 0 || row.length > 0 || inQuotes) {
    pushCell();
    pushRow();
  }

  while (rows.length && rows[rows.length - 1].every((c) => c.trim() === "")) {
    rows.pop();
  }

  if (rows.length && isHeaderRow(rows[0])) {
    rows.shift();
  }

  return rows;
}

/** Match free text to a master sub-item by EN or CN name (case-insensitive). */
export function matchSubItem(
  text: string,
  areaSubItems: MatchableSubItem[]
): MatchableSubItem | null {
  const needle = normalizeLabel(text);
  if (!needle) return null;
  return (
    areaSubItems.find(
      (item) =>
        normalizeLabel(item.nameEn) === needle || normalizeLabel(item.nameCn) === needle
    ) ?? null
  );
}

/** Parse completion cell: accepts `80`, `80%`, blanks → keep previous / 100 default via caller. */
export function parseCompletionCell(text: string): number | null {
  const raw = text.trim();
  if (!raw) return null;
  const cleaned = raw.replace(/%/g, "").replace(/,/g, "").trim();
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return Math.min(100, Math.max(0, Math.round(num)));
}

function labelForMatch(item: MatchableSubItem, lang: "en" | "cn"): string {
  if (lang === "cn") return item.nameCn || item.nameEn;
  return item.nameEn || item.nameCn;
}

function applyCellValue(
  draft: ReportWeekLineDraft,
  col: number,
  value: string,
  areaSubItems: MatchableSubItem[],
  lang: "en" | "cn"
): ReportWeekLineDraft {
  const key = GRID_COLUMN_KEYS[col];
  if (!key) return draft;

  switch (key) {
    case "subItem": {
      const matched = matchSubItem(value, areaSubItems);
      if (matched) {
        return {
          ...draft,
          subItemId: matched.id,
          subItemLabel: labelForMatch(matched, lang),
        };
      }
      return {
        ...draft,
        subItemId: "",
        subItemLabel: value.trim(),
      };
    }
    case "completion": {
      const pct = parseCompletionCell(value);
      return pct == null ? draft : { ...draft, completionPct: pct };
    }
    case "targetEn":
      return { ...draft, targetEn: value };
    case "targetCn":
      return { ...draft, targetCn: value };
    case "summaryEn":
      return { ...draft, summaryEn: value };
    case "summaryCn":
      return { ...draft, summaryCn: value };
    case "planEn":
      return { ...draft, planEn: value };
    case "planCn":
      return { ...draft, planCn: value };
    default:
      return draft;
  }
}

/**
 * Apply a pasted TSV block starting at `startCell`.
 * Extends rows up to MAX_WEEK_REPORT_LINES; excess paste rows are truncated.
 */
export function applyGridPaste(
  rows: ReportWeekLineDraft[],
  startCell: GridCellRef,
  cells: string[][],
  areaSubItems: MatchableSubItem[],
  lang: "en" | "cn" = "en"
): ReportWeekLineDraft[] {
  if (!cells.length) return rows;

  const startRow = Math.max(0, startCell.row);
  const startCol = Math.max(0, Math.min(startCell.col, GRID_COLUMN_KEYS.length - 1));
  const neededRows = Math.min(MAX_WEEK_REPORT_LINES, startRow + cells.length);

  const next = rows.map((row) => ({ ...row }));
  while (next.length < neededRows) {
    next.push(newWeekLineDraft());
  }

  const maxPasteRows = neededRows - startRow;
  for (let r = 0; r < maxPasteRows; r += 1) {
    const rowCells = cells[r] ?? [];
    let draft = { ...next[startRow + r] };
    for (let c = 0; c < rowCells.length; c += 1) {
      const col = startCol + c;
      if (col >= GRID_COLUMN_KEYS.length) break;
      draft = applyCellValue(draft, col, rowCells[c] ?? "", areaSubItems, lang);
    }
    next[startRow + r] = draft;
  }

  return next;
}

/** Resolve displayed sub-item label for a draft from master list. */
export function resolveSubItemLabel(
  draft: ReportWeekLineDraft,
  areaSubItems: MatchableSubItem[],
  lang: "en" | "cn"
): string {
  if (draft.subItemLabel.trim()) return draft.subItemLabel;
  if (draft.subItemId === "") return "";
  const item = areaSubItems.find((s) => s.id === draft.subItemId);
  return item ? labelForMatch(item, lang) : "";
}

export function hasUnmatchedSubItem(draft: ReportWeekLineDraft): boolean {
  const label = draft.subItemLabel.trim();
  return draft.subItemId === "" && label.length > 0;
}
