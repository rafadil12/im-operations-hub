"use client";

import { ExportIcon, FullViewIcon } from "@/components/ui/ActionIcons";
import { localizedName } from "@/lib/i18n";
import {
  reportText,
  type ReportLanguage,
  type ReportSubItem,
} from "@/lib/report";
import { SummaryColumnFilter } from "./SummaryColumnFilter";
import type { SummaryTableControls } from "./useSummaryTableControls";

const filterCtrl =
  "rounded-md border border-border bg-bg/40 px-2.5 py-2 text-xs text-text outline-none focus:border-accent";

const actionBtnClass =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50";

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-dim"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
      />
    </svg>
  );
}

type SummaryFilterPanelProps = {
  language: ReportLanguage;
  lang: "en" | "cn";
  year: number;
  onYearChange: (year: number) => void;
  filterWeek: number | "all";
  onFilterWeekChange: (value: number | "all") => void;
  filterSubItem: number | "all";
  onFilterSubItemChange: (value: number | "all") => void;
  weekOptions: number[];
  subItems: ReportSubItem[];
  search: string;
  onSearchChange: (value: string) => void;
  tableControls: SummaryTableControls;
  onFullView?: () => void;
  onExitFullView?: () => void;
  fullViewActive?: boolean;
};

const iconModeBtnClass =
  "inline-flex size-[30px] cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-text-muted hover:bg-surface-hover hover:text-text";

export function SummaryFilterPanel({
  language,
  lang,
  year,
  onYearChange,
  filterWeek,
  onFilterWeekChange,
  filterSubItem,
  onFilterSubItemChange,
  weekOptions,
  subItems,
  search,
  onSearchChange,
  tableControls,
  onFullView,
  onExitFullView,
  fullViewActive = false,
}: SummaryFilterPanelProps) {
  const { exporting, handleExport, columnVisibility, setColumnVisible, resetColumnWidths } =
    tableControls;

  const exitLabel = reportText("summaryExitFullView", language);

  return (
    <div className="relative z-10 space-y-2">
      <div className="flex items-center justify-end gap-2 text-xs">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting}
          className={actionBtnClass}
        >
          <ExportIcon className="size-3.5 text-white" />
          {exporting ? reportText("exporting", language) : reportText("exportLabel", language)}
        </button>
        {fullViewActive && onExitFullView ? (
          <button
            type="button"
            onClick={onExitFullView}
            className={iconModeBtnClass}
            title={exitLabel}
            aria-label={exitLabel}
          >
            <FullViewIcon className="size-3.5" />
          </button>
        ) : onFullView ? (
          <button type="button" onClick={onFullView} className={actionBtnClass}>
            <FullViewIcon className="size-3.5 text-white" />
            {reportText("summaryFullView", language)}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <SearchIcon />
          <input
            type="search"
            className="w-full rounded-md border border-border bg-bg/40 py-2 pl-9 pr-3 text-sm text-text outline-none placeholder:text-text-dim focus:border-accent"
            placeholder={reportText("searchPlaceholder", language)}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className={filterCtrl + " w-auto min-w-[88px]"}
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          aria-label={reportText("year", language)}
        >
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          className={filterCtrl + " w-auto min-w-[108px]"}
          value={filterWeek === "all" ? "all" : String(filterWeek)}
          onChange={(e) =>
            onFilterWeekChange(e.target.value === "all" ? "all" : Number(e.target.value))
          }
          aria-label={reportText("week", language)}
        >
          <option value="all">{reportText("all", language)}</option>
          {weekOptions.map((w) => (
            <option key={w} value={w}>
              Week {w}
            </option>
          ))}
        </select>
        <select
          className={filterCtrl + " w-auto min-w-[140px]"}
          value={filterSubItem === "all" ? "all" : String(filterSubItem)}
          onChange={(e) =>
            onFilterSubItemChange(e.target.value === "all" ? "all" : Number(e.target.value))
          }
          aria-label={reportText("subItem", language)}
        >
          <option value="all">{reportText("all", language)}</option>
          {subItems.map((item) => (
            <option key={item.id} value={item.id}>
              {localizedName({ name_en: item.nameEn, name_cn: item.nameCn }, lang)}
            </option>
          ))}
        </select>
        <SummaryColumnFilter
          language={language}
          visibility={columnVisibility}
          onVisibilityChange={setColumnVisible}
          onResetWidths={resetColumnWidths}
        />
      </div>
    </div>
  );
}
