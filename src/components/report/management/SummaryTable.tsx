"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ExportIcon } from "@/components/ui/ActionIcons";
import { useToast } from "@/components/ui/ToastProvider";
import { localizedField, localizedName } from "@/lib/i18n";
import {
  areaColor,
  reportText,
  type ReportArea,
  type ReportLanguage,
} from "@/lib/report";
import { completionBarColor } from "@/lib/report/completionColor";
import { exportSummaryToExcel } from "@/lib/report/summaryExport";
import type { WeekLineGroup } from "@/lib/report/summaryGrouping";
import { ExpandableTextCell } from "./ExpandableTextCell";
import {
  DEFAULT_COLUMN_WIDTHS,
  DEFAULT_COLUMN_VISIBILITY,
  loadColumnVisibility,
  loadColumnWidths,
  MIN_RESIZABLE_WIDTH,
  saveColumnVisibility,
  saveColumnWidths,
  stickyLeftOffset,
  SUMMARY_COLUMNS,
  type SummaryColumnId,
} from "./summaryTableConfig";

const reportThBase =
  "relative border border-border-subtle bg-surface px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-text-dim shadow-[0_1px_0_0_var(--color-border-subtle)]";
const reportTd = "border border-border-subtle px-3 py-2.5 align-top";
const reportTdGroup = "border border-border-subtle bg-bg/10 px-3 py-2.5 align-middle";

function WeekBadge({ weekNumber, year }: { weekNumber: number; year: number }) {
  return (
    <div className="whitespace-nowrap">
      <span className="inline-block rounded-md bg-bg/70 px-2 py-0.5 text-xs font-medium text-text-muted ring-1 ring-border-subtle">
        Week {weekNumber}
      </span>
      <p className="mt-1 text-[11px] text-text-dim">{year}</p>
    </div>
  );
}

function CompletionCell({ rate }: { rate: number | null }) {
  if (rate == null) {
    return <span className="text-text-dim">—</span>;
  }

  const pct = Math.round(rate * 100);
  const clamped = Math.min(100, Math.max(0, pct));
  const fillColor = completionBarColor(clamped);

  return (
    <div className="flex min-w-[64px] items-center gap-1.5">
      <span
        className="w-8 shrink-0 text-right text-[11px] font-semibold leading-none"
        style={{ color: fillColor }}
      >
        {pct}%
      </span>
      <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-border-subtle">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${clamped}%`, backgroundColor: fillColor }}
        />
      </div>
    </div>
  );
}

function ColumnResizer({
  onResize,
}: {
  onResize: (deltaX: number) => void;
}) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragging.current) return;
      const delta = event.clientX - lastX.current;
      lastX.current = event.clientX;
      if (delta !== 0) onResize(delta);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onResize]);

  return (
    <button
      type="button"
      aria-label="Resize column"
      className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize border-0 bg-transparent p-0 hover:bg-accent/30"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        dragging.current = true;
        lastX.current = event.clientX;
      }}
    />
  );
}

type SummaryTableToolbarProps = {
  language: ReportLanguage;
  visibility: Record<SummaryColumnId, boolean>;
  onVisibilityChange: (columnId: SummaryColumnId, visible: boolean) => void;
  onResetWidths: () => void;
  exporting: boolean;
  onExport: () => void;
};

function SummaryTableToolbar({
  language,
  visibility,
  onVisibilityChange,
  onResetWidths,
  exporting,
  onExport,
}: SummaryTableToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleCount = SUMMARY_COLUMNS.filter((col) => visibility[col]).length;

  return (
    <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
        >
          {reportText("columns", language)}
        </button>
        {menuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 cursor-default"
              aria-label="Close column menu"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-1 min-w-[180px] rounded-lg border border-border-subtle bg-surface p-2 shadow-lg">
              {SUMMARY_COLUMNS.map((columnId) => (
                <label
                  key={columnId}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text hover:bg-surface-hover"
                >
                  <input
                    type="checkbox"
                    checked={visibility[columnId]}
                    disabled={visibility[columnId] && visibleCount <= 1}
                    onChange={(event) => onVisibilityChange(columnId, event.target.checked)}
                  />
                  {reportText(columnId === "completion" ? "rate" : columnId, language)}
                </label>
              ))}
              <button
                type="button"
                onClick={() => {
                  onResetWidths();
                  setMenuOpen(false);
                }}
                className="mt-1 w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-xs text-accent hover:bg-accent/10"
              >
                {reportText("resetColumnWidths", language)}
              </button>
            </div>
          </>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onExport}
        disabled={exporting}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-50"
      >
        <ExportIcon className="size-3.5" />
        {exporting ? reportText("exporting", language) : reportText("exportExcel", language)}
      </button>
    </div>
  );
}

export type SummaryTableProps = {
  year: number;
  weekGroups: WeekLineGroup[];
  areaById: Map<number, ReportArea>;
  language: ReportLanguage;
  wrapperClassName?: string;
  showToolbar?: boolean;
};

export function SummaryTable({
  year,
  weekGroups,
  areaById,
  language,
  wrapperClassName = "overflow-auto",
  showToolbar = false,
}: SummaryTableProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_COLUMN_VISIBILITY);
  const [exporting, setExporting] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);

  useEffect(() => {
    setColumnWidths(loadColumnWidths());
    setColumnVisibility(loadColumnVisibility());
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    saveColumnWidths(columnWidths);
  }, [columnWidths, prefsReady]);

  useEffect(() => {
    if (!prefsReady) return;
    saveColumnVisibility(columnVisibility);
  }, [columnVisibility, prefsReady]);

  const visibleColumns = useMemo(
    () => SUMMARY_COLUMNS.filter((columnId) => columnVisibility[columnId]),
    [columnVisibility]
  );

  const tableMinWidth = useMemo(
    () => visibleColumns.reduce((sum, columnId) => sum + columnWidths[columnId], 0),
    [visibleColumns, columnWidths]
  );

  const resizeColumn = useCallback((columnId: SummaryColumnId, deltaX: number) => {
    setColumnWidths((current) => ({
      ...current,
      [columnId]: Math.max(MIN_RESIZABLE_WIDTH, current[columnId] + deltaX),
    }));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSummaryToExcel({ year, weekGroups, areaById, language });
      toastSuccess(reportText("exportSuccess", language));
    } catch {
      toastError(reportText("exportFailed", language));
    } finally {
      setExporting(false);
    }
  };

  const headerClass = (columnId: SummaryColumnId) => {
    const stickyLeft = stickyLeftOffset(columnId, columnWidths, columnVisibility);
    return [
      reportThBase,
      "sticky top-0",
      stickyLeft != null ? "z-40" : "z-20",
      columnId === "completion" ? "text-center" : "",
    ].join(" ");
  };

  const headerStyle = (columnId: SummaryColumnId): CSSProperties => ({
    width: columnWidths[columnId],
    minWidth: columnWidths[columnId],
    ...(stickyLeftOffset(columnId, columnWidths, columnVisibility) != null
      ? { left: stickyLeftOffset(columnId, columnWidths, columnVisibility)! }
      : {}),
  });

  const cellClass = (columnId: SummaryColumnId, extra = "") => {
    const stickyLeft = stickyLeftOffset(columnId, columnWidths, columnVisibility);
    return [
      columnId === "week" || columnId === "area" ? reportTdGroup : reportTd,
      stickyLeft != null ? "sticky z-10 bg-surface" : "",
      columnId === "week" || columnId === "area" ? "bg-bg/10" : "",
      extra,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const cellStyle = (columnId: SummaryColumnId): CSSProperties => ({
    width: columnWidths[columnId],
    minWidth: columnWidths[columnId],
    ...(stickyLeftOffset(columnId, columnWidths, columnVisibility) != null
      ? { left: stickyLeftOffset(columnId, columnWidths, columnVisibility)! }
      : {}),
  });

  const renderHeader = (columnId: SummaryColumnId) => {
    const labelKey =
      columnId === "completion" ? "rate" : columnId === "subItem" ? "subItem" : columnId;
    return (
      <th key={columnId} className={headerClass(columnId)} style={headerStyle(columnId)}>
        {reportText(labelKey, language)}
        {!["week", "area"].includes(columnId) ? (
          <ColumnResizer onResize={(delta) => resizeColumn(columnId, delta)} />
        ) : null}
      </th>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showToolbar ? (
        <SummaryTableToolbar
          language={language}
          visibility={columnVisibility}
          onVisibilityChange={(columnId, visible) => {
            if (!visible && visibleColumns.length <= 1) return;
            setColumnVisibility((current) => ({ ...current, [columnId]: visible }));
          }}
          onResetWidths={() => setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS })}
          exporting={exporting}
          onExport={() => void handleExport()}
        />
      ) : null}
      <div className={wrapperClassName}>
        <table
          className="border-collapse text-left text-sm"
          style={{ minWidth: tableMinWidth, width: "100%", tableLayout: "fixed" }}
        >
          <thead>
            <tr>{visibleColumns.map((columnId) => renderHeader(columnId))}</tr>
          </thead>
          <tbody>
            {weekGroups.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className={`${reportTd} py-12 text-center text-text-muted`}
                >
                  {reportText("noLines", language)}
                </td>
              </tr>
            ) : (
              weekGroups.map((group, groupIndex) => {
                const isLastWeekGroup = groupIndex === weekGroups.length - 1;
                let weekRowIndex = 0;

                return group.areaGroups.map((areaGroup) => {
                  const area = areaById.get(areaGroup.areaId);
                  const color = area ? areaColor(area.code) : undefined;

                  return areaGroup.lines.map((row, lineIndex) => {
                    const target = localizedField(row.workTargetEn, row.workTargetCn, language);
                    const summary = localizedField(row.summaryEn, row.summaryCn, language);
                    const plan = localizedField(row.planEn, row.planCn, language);
                    const subItem =
                      localizedField(row.subItemNameEn, row.subItemNameCn, language) || "—";
                    const isFirstInWeek = weekRowIndex === 0;
                    const isFirstInArea = lineIndex === 0;
                    const isLastInWeek = weekRowIndex === group.totalLines - 1;
                    const isLastInArea = lineIndex === areaGroup.lines.length - 1;
                    const weekBottomBorder =
                      isLastInWeek && !isLastWeekGroup ? "border-b-2 border-b-border" : "";
                    const areaBottomBorder =
                      isLastInArea && !isLastInWeek ? "border-b border-b-border-subtle" : "";

                    weekRowIndex += 1;

                    const cells: Partial<Record<SummaryColumnId, ReactNode>> = {
                      week: isFirstInWeek ? (
                        <WeekBadge weekNumber={group.weekNumber} year={group.year} />
                      ) : null,
                      area:
                        isFirstInArea && area ? (
                          <span className="inline-flex items-center gap-2 text-sm font-medium text-text">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                              aria-hidden
                            />
                            {localizedName(
                              { name_en: area.nameEn, name_cn: area.nameCn },
                              language
                            )}
                          </span>
                        ) : isFirstInArea ? (
                          "—"
                        ) : null,
                      subItem: <span className="text-sm font-medium text-accent">{subItem}</span>,
                      target: <ExpandableTextCell text={target} language={language} />,
                      completion: <CompletionCell rate={row.weeklyCompletionRate} />,
                      summary: <ExpandableTextCell text={summary} language={language} muted />,
                      plan: <ExpandableTextCell text={plan || "—"} language={language} muted />,
                    };

                    return (
                      <tr key={row.id} className="align-top">
                        {visibleColumns.map((columnId) => {
                          if (
                            (columnId === "week" && !isFirstInWeek) ||
                            (columnId === "area" && !isFirstInArea)
                          ) {
                            return null;
                          }

                          const rowSpan =
                            columnId === "week"
                              ? group.totalLines
                              : columnId === "area"
                                ? areaGroup.lines.length
                                : undefined;

                          return (
                            <td
                              key={columnId}
                              rowSpan={rowSpan}
                              className={cellClass(
                                columnId,
                                `${weekBottomBorder} ${columnId === "area" ? areaBottomBorder : ""}`
                              )}
                              style={cellStyle(columnId)}
                            >
                              {cells[columnId]}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                });
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
