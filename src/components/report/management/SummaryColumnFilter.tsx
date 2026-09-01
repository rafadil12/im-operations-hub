"use client";

import { useState } from "react";
import { reportText, type ReportLanguage } from "@/lib/report";
import { SUMMARY_COLUMNS, type SummaryColumnId } from "./summaryTableConfig";

type SummaryColumnFilterProps = {
  language: ReportLanguage;
  visibility: Record<SummaryColumnId, boolean>;
  onVisibilityChange: (columnId: SummaryColumnId, visible: boolean) => void;
  onResetWidths: () => void;
};

export function SummaryColumnFilter({
  language,
  visibility,
  onVisibilityChange,
  onResetWidths,
}: SummaryColumnFilterProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleCount = SUMMARY_COLUMNS.filter((col) => visibility[col]).length;

  return (
    <div className="relative z-10 shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="cursor-pointer whitespace-nowrap rounded-md border border-border bg-bg/40 px-2.5 py-2 text-xs text-text outline-none hover:bg-surface-hover focus:border-accent"
      >
        {reportText("filterColumns", language)}
      </button>
      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            aria-label="Close column menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 z-30 mt-1 min-w-[180px] rounded-lg border border-border-subtle bg-surface p-2 shadow-lg">
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
  );
}
