"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { reportText, type ReportArea, type ReportLanguage } from "@/lib/report";
import { exportSummaryToExcel } from "@/lib/report/summaryExport";
import type { WeekLineGroup } from "@/lib/report/summaryGrouping";
import {
  DEFAULT_COLUMN_WIDTHS,
  DEFAULT_COLUMN_VISIBILITY,
  loadColumnVisibility,
  loadColumnWidths,
  MIN_RESIZABLE_WIDTH,
  saveColumnVisibility,
  saveColumnWidths,
  SUMMARY_COLUMNS,
  type SummaryColumnId,
} from "./summaryTableConfig";

export function useSummaryTableControls(input: {
  year: number;
  weekGroups: WeekLineGroup[];
  areaById: Map<number, ReportArea>;
  language: ReportLanguage;
}) {
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

  const setColumnVisible = useCallback((columnId: SummaryColumnId, visible: boolean) => {
    setColumnVisibility((current) => {
      const visibleCount = SUMMARY_COLUMNS.filter((col) => current[col]).length;
      if (!visible && visibleCount <= 1) return current;
      return { ...current, [columnId]: visible };
    });
  }, []);

  const resizeColumn = useCallback((columnId: SummaryColumnId, deltaX: number) => {
    setColumnWidths((current) => ({
      ...current,
      [columnId]: Math.max(MIN_RESIZABLE_WIDTH, current[columnId] + deltaX),
    }));
  }, []);

  const resetColumnWidths = useCallback(() => {
    setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS });
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportSummaryToExcel({
        year: input.year,
        weekGroups: input.weekGroups,
        areaById: input.areaById,
        language: input.language,
      });
      toastSuccess(reportText("exportSuccess", input.language));
    } catch {
      toastError(reportText("exportFailed", input.language));
    } finally {
      setExporting(false);
    }
  }, [input.areaById, input.language, input.weekGroups, input.year, toastError, toastSuccess]);

  return {
    columnWidths,
    columnVisibility,
    visibleColumns,
    setColumnVisible,
    resizeColumn,
    resetColumnWidths,
    exporting,
    handleExport,
  };
}

export type SummaryTableControls = ReturnType<typeof useSummaryTableControls>;
