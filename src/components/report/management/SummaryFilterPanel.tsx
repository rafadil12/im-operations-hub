"use client";

import { useMemo } from "react";
import { ExportIcon, FullViewIcon } from "@/components/ui/ActionIcons";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";
import { localizedName } from "@/lib/i18n";
import {
  reportText,
  type ReportArea,
  type ReportLanguage,
  type ReportSubItem,
} from "@/lib/report";
import { SummaryColumnFilter } from "./SummaryColumnFilter";
import type { SummaryTableControls } from "./useSummaryTableControls";

const actionBtnClass =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50";

/** Fixed filter widths — do not grow with selected label length. */
const FILTER_WIDTH = {
  year: "w-[4.75rem] shrink-0",
  area: "w-[7.5rem] shrink-0",
  week: "w-[6.75rem] shrink-0",
  subItem: "w-[9.5rem] shrink-0",
} as const;

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
  filterArea: number | "all";
  onFilterAreaChange: (value: number | "all") => void;
  filterWeek: number | "all";
  onFilterWeekChange: (value: number | "all") => void;
  filterSubItem: number | "all";
  onFilterSubItemChange: (value: number | "all") => void;
  weekOptions: number[];
  areas: ReportArea[];
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
  filterArea,
  onFilterAreaChange,
  filterWeek,
  onFilterWeekChange,
  filterSubItem,
  onFilterSubItemChange,
  weekOptions,
  areas,
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
  const allLabel = reportText("all", language);

  const yearOptions = useMemo(
    () =>
      [2025, 2026, 2027].map((y) => ({
        value: String(y),
        label: String(y),
      })),
    []
  );

  const areaOptions = useMemo(
    () => [
      { value: "all", label: allLabel },
      ...areas.map((area) => ({
        value: String(area.id),
        label: localizedName({ name_en: area.nameEn, name_cn: area.nameCn }, lang),
      })),
    ],
    [areas, allLabel, lang]
  );

  const weekFilterOptions = useMemo(
    () => [
      { value: "all", label: allLabel },
      ...weekOptions.map((w) => ({
        value: String(w),
        label: `Week ${w}`,
      })),
    ],
    [weekOptions, allLabel]
  );

  const subItemOptions = useMemo(
    () => [
      { value: "all", label: allLabel },
      ...subItems.map((item) => ({
        value: String(item.id),
        label: localizedName({ name_en: item.nameEn, name_cn: item.nameCn }, lang),
      })),
    ],
    [subItems, allLabel, lang]
  );

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
        <SparepartDropdown
          className={FILTER_WIDTH.year}
          compact
          value={String(year)}
          onChange={(next) => onYearChange(Number(next))}
          options={yearOptions}
          placeholder={reportText("year", language)}
        />
        <SparepartDropdown
          className={FILTER_WIDTH.area}
          compact
          value={filterArea === "all" ? "all" : String(filterArea)}
          onChange={(next) => onFilterAreaChange(next === "all" ? "all" : Number(next))}
          options={areaOptions}
          placeholder={reportText("area", language)}
        />
        <SparepartDropdown
          className={FILTER_WIDTH.week}
          compact
          value={filterWeek === "all" ? "all" : String(filterWeek)}
          onChange={(next) => onFilterWeekChange(next === "all" ? "all" : Number(next))}
          options={weekFilterOptions}
          placeholder={reportText("week", language)}
        />
        <SparepartDropdown
          className={FILTER_WIDTH.subItem}
          compact
          value={filterSubItem === "all" ? "all" : String(filterSubItem)}
          onChange={(next) => onFilterSubItemChange(next === "all" ? "all" : Number(next))}
          options={subItemOptions}
          placeholder={reportText("subItem", language)}
        />
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
