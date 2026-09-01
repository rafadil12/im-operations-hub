"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { localizedField, localizedName } from "@/lib/i18n";
import {
  areaColor,
  reportText,
  type ReportArea,
  type ReportLanguage,
} from "@/lib/report";
import { completionBarColor } from "@/lib/report/completionColor";
import type { WeekLineGroup } from "@/lib/report/summaryGrouping";
import { ExpandableTextCell } from "./ExpandableTextCell";
import { WeekBadge } from "./WeekBadge";
import {
  stickyLeftOffset,
  type SummaryColumnId,
} from "./summaryTableConfig";
import type { SummaryTableControls } from "./useSummaryTableControls";

const reportThBase =
  "relative border border-border-subtle bg-surface px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-text-dim shadow-[0_1px_0_0_var(--color-border-subtle)]";
const reportTd = "border border-border-subtle px-3 py-2.5 align-top";
const reportTdGroup = "border border-border-subtle bg-bg/10 px-3 py-2.5 align-middle";

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

function ColumnResizer({ onResize }: { onResize: (deltaX: number) => void }) {
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

export type SummaryTableProps = {
  weekGroups: WeekLineGroup[];
  areaById: Map<number, ReportArea>;
  language: ReportLanguage;
  controls: SummaryTableControls;
  wrapperClassName?: string;
};

export function SummaryTable({
  weekGroups,
  areaById,
  language,
  controls,
  wrapperClassName = "overflow-auto",
}: SummaryTableProps) {
  const { columnWidths, columnVisibility, visibleColumns, resizeColumn } = controls;

  const tableMinWidth = useMemo(
    () => visibleColumns.reduce((sum, columnId) => sum + columnWidths[columnId], 0),
    [visibleColumns, columnWidths]
  );

  const headerClass = (columnId: SummaryColumnId) => {
    const stickyLeft = stickyLeftOffset(columnId, columnWidths, columnVisibility);
    return [
      reportThBase,
      "sticky top-0",
      stickyLeft != null ? "z-[3]" : "z-[2]",
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
      stickyLeft != null ? "sticky z-[1] bg-surface" : "",
      columnId === "week" || columnId === "area" ? "bg-bg/10" : "",
      columnId === "week" ? "text-center" : "",
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
