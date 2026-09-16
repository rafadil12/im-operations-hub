"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { apiSendAbs, getApiErrorMessage } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";
import {
  applyGridPaste,
  GRID_COLUMN_KEYS,
  hasUnmatchedSubItem,
  matchSubItem,
  parseClipboardGrid,
  parseCompletionCell,
  reportText,
  type GridColumnKey,
  type ReportLanguage,
  type ReportSubItem,
} from "@/lib/report";
import {
  MAX_WEEK_REPORT_LINES,
  newWeekLineDraft,
  type ReportWeekLineDraft,
} from "@/lib/report/weekFormDraft";

type ReportWeekGridProps = {
  language: ReportLanguage;
  lines: ReportWeekLineDraft[];
  areaId: number;
  areaSubItems: ReportSubItem[];
  readOnly: boolean;
  onChange: (lines: ReportWeekLineDraft[]) => void;
  onSubItemCreated?: (item: ReportSubItem) => void;
};

const thClass =
  "sticky top-0 z-10 border border-border-subtle bg-surface px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-text-dim whitespace-nowrap";
const tdClass = "border border-border-subtle p-0 align-top";
const cellInput =
  "block w-full min-w-0 border-0 bg-transparent px-2 py-1.5 text-xs text-text outline-none focus:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-70";
const cellTextarea =
  "block w-full min-w-[9rem] resize-y border-0 bg-transparent px-2 py-1.5 text-xs leading-5 text-text outline-none focus:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-70";
const dialogField =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-1.5 text-sm text-text outline-none focus:border-accent";

function columnHeader(key: GridColumnKey, language: ReportLanguage): string {
  switch (key) {
    case "subItem":
      return reportText("subItem", language);
    case "completion":
      return reportText("rate", language);
    case "targetEn":
      return reportText("targetEn", language);
    case "targetCn":
      return reportText("targetCn", language);
    case "summaryEn":
      return reportText("summaryEn", language);
    case "summaryCn":
      return reportText("summaryCn", language);
    case "planEn":
      return reportText("planEn", language);
    case "planCn":
      return reportText("planCn", language);
  }
}

function cellId(row: number, col: number): string {
  return `report-grid-${row}-${col}`;
}

function subscribe() {
  return () => {};
}

export function ReportWeekGrid({
  language,
  lines,
  areaId,
  areaSubItems,
  readOnly,
  onChange,
  onSubItemCreated,
}: ReportWeekGridProps) {
  const { lang, t } = useLang();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const focusRef = useRef<{ row: number; col: number }>({ row: 0, col: 0 });
  const [createForKey, setCreateForKey] = useState<string | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameCn, setNameCn] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const updateLine = (key: string, patch: Partial<ReportWeekLineDraft>) => {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const setSubItemFromText = (line: ReportWeekLineDraft, text: string) => {
    const matched = matchSubItem(text, areaSubItems);
    if (matched) {
      updateLine(line.key, {
        subItemId: matched.id,
        subItemLabel: lang === "cn" ? matched.nameCn || matched.nameEn : matched.nameEn || matched.nameCn,
      });
      return;
    }
    updateLine(line.key, { subItemId: "", subItemLabel: text });
  };

  const openCreateDialog = (line: ReportWeekLineDraft) => {
    const seed = line.subItemLabel.trim();
    const seedLooksCn = /[\u3400-\u9fff]/.test(seed);
    setCreateForKey(line.key);
    setNameEn(seedLooksCn ? "" : seed);
    setNameCn(seedLooksCn ? seed : "");
    setCreateError(null);
  };

  const closeCreateDialog = () => {
    if (creating) return;
    setCreateForKey(null);
    setNameEn("");
    setNameCn("");
    setCreateError(null);
  };

  const submitCreateSubItem = async () => {
    if (!createForKey) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await apiSendAbs<{
        success: boolean;
        data?: ReportSubItem;
        error?: string;
      }>("/api/report/sub-items", "POST", {
        areaId,
        nameEn,
        nameCn,
      });
      if (!res.success || !res.data) {
        throw new Error(res.error ?? "Failed to create sub-item");
      }
      const item = res.data;
      onSubItemCreated?.(item);
      updateLine(createForKey, {
        subItemId: item.id,
        subItemLabel: lang === "cn" ? item.nameCn || item.nameEn : item.nameEn || item.nameCn,
      });
      setCreateForKey(null);
      setNameEn("");
      setNameCn("");
    } catch (err) {
      setCreateError(getApiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLElement>, row: number, col: number) => {
    if (readOnly) return;
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n") && !text.includes("\r")) {
      return;
    }
    event.preventDefault();
    const cells = parseClipboardGrid(text);
    onChange(applyGridPaste(lines, { row, col }, cells, areaSubItems, lang));
  };

  const focusCell = (row: number, col: number) => {
    const el = document.getElementById(cellId(row, col)) as HTMLInputElement | HTMLTextAreaElement | null;
    el?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    row: number,
    col: number
  ) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.currentTarget.tagName === "TEXTAREA" && !event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const nextRow = row + 1;
    if (nextRow < lines.length) {
      focusCell(nextRow, col);
    } else if (!readOnly && lines.length < MAX_WEEK_REPORT_LINES) {
      onChange([...lines, newWeekLineDraft()]);
      requestAnimationFrame(() => focusCell(nextRow, col));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-text">{reportText("subItem", language)}</h3>
          {!readOnly ? (
            <p className="mt-0.5 max-w-3xl text-[11px] text-text-muted">
              {reportText("pasteHint", language)}
            </p>
          ) : null}
        </div>
        {!readOnly ? (
          <button
            type="button"
            disabled={lines.length >= MAX_WEEK_REPORT_LINES}
            title={
              lines.length >= MAX_WEEK_REPORT_LINES
                ? reportText("maxLinesReached", language)
                : undefined
            }
            onClick={() =>
              onChange(
                lines.length >= MAX_WEEK_REPORT_LINES ? lines : [...lines, newWeekLineDraft()]
              )
            }
            className="cursor-pointer rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            + {reportText("addLine", language)}
          </button>
        ) : null}
      </div>

      <div className="overflow-auto rounded-lg border border-border-subtle">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              {GRID_COLUMN_KEYS.map((key) => (
                <th key={key} className={thClass}>
                  {columnHeader(key, language)}
                </th>
              ))}
              {!readOnly ? <th className={`${thClass} w-24`}>{reportText("actions", language)}</th> : null}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, rowIndex) => {
              const unmatched = hasUnmatchedSubItem(line);
              return (
                <tr key={line.key} className="align-top">
                  <td className={`${tdClass} bg-bg/20 px-2 py-1.5 text-center text-[11px] text-text-dim`}>
                    {rowIndex + 1}
                  </td>
                  <td className={tdClass}>
                    <input
                      id={cellId(rowIndex, 0)}
                      className={[
                        cellInput,
                        unmatched ? "text-danger ring-1 ring-inset ring-danger/40" : "",
                      ].join(" ")}
                      value={line.subItemLabel}
                      disabled={readOnly}
                      placeholder={reportText("subItem", language)}
                      list={`report-subitems-${line.key}`}
                      title={
                        unmatched
                          ? reportText("subItemNotFound", language).replace(
                              "{name}",
                              line.subItemLabel
                            )
                          : undefined
                      }
                      onFocus={() => {
                        focusRef.current = { row: rowIndex, col: 0 };
                      }}
                      onChange={(e) => setSubItemFromText(line, e.target.value)}
                      onPaste={(e) => handlePaste(e, rowIndex, 0)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
                    />
                    <datalist id={`report-subitems-${line.key}`}>
                      {areaSubItems.map((item) => (
                        <option key={item.id} value={lang === "cn" ? item.nameCn : item.nameEn} />
                      ))}
                    </datalist>
                    {!readOnly && unmatched ? (
                      <button
                        type="button"
                        onClick={() => openCreateDialog(line)}
                        className="mx-2 mb-1.5 cursor-pointer text-[10px] font-medium text-accent hover:underline"
                      >
                        + {reportText("newSubItem", language)}
                      </button>
                    ) : null}
                  </td>
                  <td className={`${tdClass} w-20`}>
                    <input
                      id={cellId(rowIndex, 1)}
                      type="text"
                      inputMode="numeric"
                      className={`${cellInput} text-center tabular-nums`}
                      value={String(line.completionPct)}
                      disabled={readOnly}
                      onFocus={() => {
                        focusRef.current = { row: rowIndex, col: 1 };
                      }}
                      onChange={(e) => {
                        const pct = parseCompletionCell(e.target.value);
                        if (pct == null && e.target.value.trim() !== "") return;
                        updateLine(line.key, {
                          completionPct: pct ?? 0,
                        });
                      }}
                      onPaste={(e) => handlePaste(e, rowIndex, 1)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, 1)}
                    />
                  </td>
                  {(
                    [
                      ["targetEn", 2],
                      ["targetCn", 3],
                      ["summaryEn", 4],
                      ["summaryCn", 5],
                      ["planEn", 6],
                      ["planCn", 7],
                    ] as const
                  ).map(([field, col]) => (
                    <td key={field} className={tdClass}>
                      <textarea
                        id={cellId(rowIndex, col)}
                        rows={2}
                        className={cellTextarea}
                        value={line[field]}
                        disabled={readOnly}
                        onFocus={() => {
                          focusRef.current = { row: rowIndex, col };
                        }}
                        onChange={(e) => updateLine(line.key, { [field]: e.target.value })}
                        onPaste={(e) => handlePaste(e, rowIndex, col)}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, col)}
                      />
                    </td>
                  ))}
                  {!readOnly ? (
                    <td className={`${tdClass} px-2 py-1.5 text-center`}>
                      {lines.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
                          className="cursor-pointer text-[11px] text-danger hover:underline"
                        >
                          {reportText("removeLine", language)}
                        </button>
                      ) : (
                        <span className="text-[11px] text-text-dim">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {lines.some(hasUnmatchedSubItem) ? (
        <p className="text-[11px] text-danger">
          {reportText("subItemNotFound", language).replace(
            "{name}",
            lines.find(hasUnmatchedSubItem)?.subItemLabel ?? ""
          )}
        </p>
      ) : null}

      {mounted && createForKey
        ? createPortal(
            <div className="fixed inset-0 z-[1101] flex items-center justify-center p-4">
              <button
                type="button"
                aria-label={t.common.cancel}
                className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
                onClick={closeCreateDialog}
              />
              <div
                role="dialog"
                aria-modal="true"
                className="relative z-10 w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-[0_24px_60px_var(--shadow-color)]"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-sm font-semibold text-text">
                  {reportText("newSubItemTitle", language)}
                </h3>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-muted">
                      {reportText("subItemNameEn", language)}
                    </label>
                    <input
                      className={dialogField}
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      disabled={creating}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-muted">
                      {reportText("subItemNameCn", language)}
                    </label>
                    <input
                      className={dialogField}
                      value={nameCn}
                      onChange={(e) => setNameCn(e.target.value)}
                      disabled={creating}
                    />
                  </div>
                  {createError ? <p className="text-xs text-danger">{createError}</p> : null}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeCreateDialog}
                    disabled={creating}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-60"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitCreateSubItem()}
                    disabled={creating || !nameEn.trim() || !nameCn.trim()}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {creating ? t.common.loading : reportText("createSubItem", language)}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
