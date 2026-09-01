"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { localizedField, localizedName, useLang } from "@/lib/i18n";
import {
  areaColor,
  groupLinesByWeek,
  reportText,
  type ReportArea,
  type ReportSubItem,
  type ReportLanguage,
  type ReportLine,
  type ReportWeek,
} from "@/lib/report";
import { completionBarColor } from "@/lib/report/completionColor";
import { getWeekNumberForDate } from "@/lib/report/weekCalendar";
import { ReportWeekFormModal } from "./ReportWeekFormModal";
import { SummaryFilterPanel } from "./SummaryFilterPanel";
import { SummaryFullViewWorkspace } from "./SummaryFullViewWorkspace";
import { SummaryTable } from "./SummaryTable";
import { useSummaryTableControls } from "./useSummaryTableControls";

const filterCtrl =
  "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";

const reportTh =
  "sticky top-0 z-20 border border-border-subtle bg-surface px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-text-dim shadow-[0_1px_0_0_var(--color-border-subtle)]";
const reportTd = "border border-border-subtle px-3 py-2.5 align-top";

type ActiveTab = number | "summary";

export type ReportManagementMode = "summary" | "reports";

type ReportFilterBarProps = {
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
  areaId: number | null;
  actions?: ReactNode;
};

function FilterField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-text-dim">
        {label}
      </label>
      {children}
    </div>
  );
}

function ReportFilterBar({
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
  areaId,
  actions,
}: ReportFilterBarProps) {
  const visibleSubItems = subItems.filter((item) => areaId == null || item.areaId === areaId);

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
        <FilterField label={reportText("year", language)} className="min-w-[88px]">
          <select
            className={filterCtrl + " w-full min-w-[88px]"}
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
        </FilterField>
        <FilterField label={reportText("week", language)} className="min-w-[120px]">
          <select
            className={filterCtrl + " w-full min-w-[120px]"}
            value={filterWeek === "all" ? "all" : String(filterWeek)}
            onChange={(e) =>
              onFilterWeekChange(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">{reportText("all", language)}</option>
            {weekOptions.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={reportText("subItem", language)} className="min-w-[160px]">
          <select
            className={filterCtrl + " w-full min-w-[160px]"}
            value={filterSubItem === "all" ? "all" : String(filterSubItem)}
            onChange={(e) =>
              onFilterSubItemChange(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">{reportText("all", language)}</option>
            {visibleSubItems.map((item) => (
              <option key={item.id} value={item.id}>
                {localizedName({ name_en: item.nameEn, name_cn: item.nameCn }, lang)}
              </option>
            ))}
          </select>
        </FilterField>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

function WeekBadge({
  weekNumber,
  year,
  onClick,
}: {
  weekNumber: number;
  year: number;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="inline-block rounded-md bg-bg/70 px-2 py-0.5 text-xs font-medium text-text-muted ring-1 ring-border-subtle">
        Week {weekNumber}
      </span>
      <p className="mt-1 text-[11px] text-text-dim">{year}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer whitespace-nowrap text-left hover:opacity-80"
      >
        {inner}
      </button>
    );
  }

  return <div className="whitespace-nowrap">{inner}</div>;
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

export function ReportManagement({ mode }: { mode: ReportManagementMode }) {
  const { lang } = useLang();
  const language = lang as ReportLanguage;
  const access = useRoleAccess();
  const { success: toastSuccess, error: toastError } = useToast();

  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    mode === "summary" ? "summary" : 0
  );
  const [filterWeek, setFilterWeek] = useState<number | "all">("all");
  const [filterSubItem, setFilterSubItem] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [weeks, setWeeks] = useState<ReportWeek[]>([]);
  const [areas, setAreas] = useState<ReportArea[]>([]);
  const [subItems, setSubItems] = useState<ReportSubItem[]>([]);
  const [lines, setLines] = useState<ReportLine[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<"draft" | "submitted" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekFormOpen, setWeekFormOpen] = useState(false);
  const [weekFormMode, setWeekFormMode] = useState<"create" | "edit">("create");
  const [weekFormWeek, setWeekFormWeek] = useState(getWeekNumberForDate());
  const [submitting, setSubmitting] = useState(false);
  const [reopenConfirm, setReopenConfirm] = useState(false);
  const [summaryFullscreenOpen, setSummaryFullscreenOpen] = useState(false);

  const isSummary = mode === "summary";
  const areaId = isSummary || typeof activeTab !== "number" ? null : activeTab;
  const canCreate = access.canCreateReportLine;
  const canUpdate = access.canUpdateReportLine;
  const canSubmit = access.canSubmitReport;
  const canReopen = access.canReopenReport;
  const isSubmitted = submissionStatus === "submitted";
  const selectedWeekFilter = filterWeek === "all" ? null : filterWeek;

  const selectedWeek = useMemo(
    () =>
      selectedWeekFilter != null
        ? (weeks.find((w) => w.year === year && w.weekNumber === selectedWeekFilter) ?? null)
        : null,
    [weeks, year, selectedWeekFilter]
  );

  const loadWeeks = useCallback(async () => {
    const res = await apiGetAbs<{ success: boolean; data: ReportWeek[] }>(
      `/api/report/weeks?year=${year}`
    );
    if (res.success && res.data) setWeeks(res.data);
  }, [year]);

  const loadLines = useCallback(async () => {
    if (!areas.length && !isSummary) {
      setLines([]);
      setSubmissionStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ year: String(year) });
      if (!isSummary && areaId != null) qs.set("areaId", String(areaId));

      const res = await apiGetAbs<{
        success: boolean;
        data: ReportLine[];
        areas?: ReportArea[];
        subItems?: ReportSubItem[];
        error?: string;
      }>(`/api/report/lines?${qs}`);

      if (!res.success) throw new Error(res.error ?? "Failed");
      setLines(res.data ?? []);
      if (res.areas) setAreas(res.areas);
      if (res.subItems) setSubItems(res.subItems);

      if (!isSummary && selectedWeek && areaId != null) {
        const subRes = await apiGetAbs<{
          success: boolean;
          data: { status: "draft" | "submitted" } | null;
        }>(`/api/report/submissions?weekId=${selectedWeek.id}&areaId=${areaId}`);
        setSubmissionStatus(subRes.data?.status ?? null);
      } else {
        setSubmissionStatus(null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err) || reportText("errorLoad", language));
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [year, areaId, isSummary, selectedWeek, language, areas.length]);

  useEffect(() => {
    void loadWeeks();
  }, [loadWeeks]);

  useEffect(() => {
    void (async () => {
      const res = await apiGetAbs<{ success: boolean; data: ReportLine[]; areas?: ReportArea[] }>(
        `/api/report/lines?year=${year}`
      );
      if (res.areas) setAreas(res.areas);
    })();
  }, [year]);

  useEffect(() => {
    void loadLines();
  }, [loadLines]);

  useEffect(() => {
    if (mode === "summary") return;
    if (
      typeof activeTab === "number" &&
      areas.length &&
      !areas.some((area) => area.id === activeTab)
    ) {
      setActiveTab(areas[0].id);
    }
  }, [areas, activeTab, mode]);

  useEffect(() => {
    setFilterWeek("all");
    setFilterSubItem("all");
    setSearch("");
  }, [activeTab, year]);

  const weekOptions = useMemo(() => {
    const fromLines = new Set<number>();
    lines.forEach((line) => {
      if (line.weekNumber != null) fromLines.add(line.weekNumber);
    });
    weeks.forEach((w) => fromLines.add(w.weekNumber));
    return Array.from(fromLines).sort((a, b) => b - a);
  }, [lines, weeks]);

  const areaById = useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas]);

  const filteredLines = useMemo(() => {
    const q = isSummary ? search.trim().toLowerCase() : "";
    return lines.filter((row) => {
      if (filterWeek !== "all" && row.weekNumber !== filterWeek) return false;
      if (filterSubItem !== "all" && row.subItemId !== filterSubItem) return false;
      if (!q) return true;

      const area = areaById.get(row.areaId);
      const haystack = [
        area ? localizedName({ name_en: area.nameEn, name_cn: area.nameCn }, lang) : "",
        localizedField(row.subItemNameEn, row.subItemNameCn, lang),
        localizedField(row.workTargetEn, row.workTargetCn, lang),
        localizedField(row.summaryEn, row.summaryCn, lang),
        localizedField(row.planEn, row.planCn, lang),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [lines, filterWeek, filterSubItem, search, lang, areaById, isSummary]);

  const weekGroups = useMemo(
    () => (isSummary ? groupLinesByWeek(filteredLines, areas) : []),
    [isSummary, filteredLines, areas]
  );

  const summaryTableControls = useSummaryTableControls({
    year,
    weekGroups,
    areaById,
    language,
  });

  const openCreateWeek = () => {
    setWeekFormMode("create");
    setWeekFormWeek(selectedWeekFilter ?? getWeekNumberForDate(new Date()));
    setWeekFormOpen(true);
  };

  const openEditWeek = (weekNumber: number) => {
    setWeekFormMode("edit");
    setWeekFormWeek(weekNumber);
    setWeekFormOpen(true);
  };

  const rowCanEditWeek = (row: ReportLine) => {
    if (!canUpdate && !canCreate) return false;
    if (row.submissionStatus === "submitted") return false;
    return row.weekNumber != null;
  };

  const submitArea = async () => {
    if (!selectedWeekFilter || !areaId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/report/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          weekNumber: selectedWeekFilter,
          areaId,
          weekId: selectedWeek?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Submit failed");
      toastSuccess(reportText("submitSuccess", language));
      setSubmissionStatus("submitted");
      await loadLines();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const reopenArea = async () => {
    if (!selectedWeekFilter || !areaId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/report/submissions/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          weekNumber: selectedWeekFilter,
          areaId,
          weekId: selectedWeek?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Reopen failed");
      toastSuccess(reportText("reopenSuccess", language));
      setSubmissionStatus("draft");
      setReopenConfirm(false);
      await loadLines();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleWeekSaved = async () => {
    toastSuccess(reportText("saveWeekSuccess", language));
    await loadLines();
    await loadWeeks();
  };

  const reportsFilterBarProps = {
    language,
    lang,
    year,
    onYearChange: setYear,
    filterWeek,
    onFilterWeekChange: setFilterWeek,
    filterSubItem,
    onFilterSubItemChange: setFilterSubItem,
    weekOptions,
    subItems,
    areaId,
  };

  const summaryFilterPanelProps = {
    language,
    lang,
    year,
    onYearChange: setYear,
    filterWeek,
    onFilterWeekChange: setFilterWeek,
    filterSubItem,
    onFilterSubItemChange: setFilterSubItem,
    weekOptions,
    subItems,
    search,
    onSearchChange: setSearch,
    tableControls: summaryTableControls,
    onFullView:
      !loading && !error ? () => setSummaryFullscreenOpen(true) : undefined,
  };

  const reportActions = (
    <>
      {submissionStatus && selectedWeekFilter != null ? (
        <span
          className={`rounded-md px-2 py-1 text-xs font-medium ${
            isSubmitted ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          }`}
        >
          {isSubmitted ? reportText("submitted", language) : reportText("draft", language)}
        </span>
      ) : null}
      {canCreate && !(selectedWeekFilter != null && isSubmitted) ? (
        <button
          type="button"
          onClick={openCreateWeek}
          disabled={areaId == null}
          className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {reportText("addReport", language)}
        </button>
      ) : null}
      {canSubmit && !isSubmitted && selectedWeekFilter != null ? (
        <button
          type="button"
          onClick={() => void submitArea()}
          disabled={submitting || !lines.some((l) => l.weekNumber === selectedWeekFilter)}
          className="cursor-pointer rounded-md border border-accent px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-50"
        >
          {reportText("submit", language)}
        </button>
      ) : null}
      {canReopen && isSubmitted && selectedWeekFilter != null ? (
        <button
          type="button"
          onClick={() => setReopenConfirm(true)}
          disabled={submitting}
          className="cursor-pointer rounded-md border border-warning px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/10 disabled:opacity-50"
        >
          {reportText("reopen", language)}
        </button>
      ) : null}
    </>
  );

  const summaryContextSubtitle = [
    filterWeek !== "all" ? `Week ${filterWeek}` : reportText("all", language),
    filterSubItem !== "all"
      ? localizedName(
          {
            name_en: subItems.find((item) => item.id === filterSubItem)?.nameEn ?? "",
            name_cn: subItems.find((item) => item.id === filterSubItem)?.nameCn ?? "",
          },
          lang
        )
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-0">
      {mode === "reports" ? (
        <div className="overflow-x-auto border-b border-border-subtle">
          <div className="flex min-w-max gap-6">
            {areas.map((area) => {
              const active = activeTab === area.id;
              const color = areaColor(area.code);
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setActiveTab(area.id)}
                  className={[
                    "relative flex cursor-pointer items-center gap-2 pb-3 pt-1 text-sm font-medium transition-colors",
                    active ? "text-text" : "text-text-muted hover:text-text",
                  ].join(" ")}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  {localizedName({ name_en: area.nameEn, name_cn: area.nameCn }, lang)}
                  {active ? (
                    <span
                      className="absolute inset-x-0 bottom-0 h-0.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="py-4">
        {isSummary ? (
          <SummaryFilterPanel {...summaryFilterPanelProps} />
        ) : (
          <ReportFilterBar {...reportsFilterBarProps} actions={reportActions} />
        )}
      </div>

      {loading ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
          {reportText("loading", language)}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</div>
      ) : null}

      {!loading && !error ? (
        isSummary ? (
          <SummaryTable
            weekGroups={weekGroups}
            areaById={areaById}
            language={language}
            controls={summaryTableControls}
            wrapperClassName="overflow-auto rounded-xl border border-border-subtle bg-surface min-h-[32rem] max-h-[calc(100dvh-14rem)]"
          />
        ) : (
        <div className="overflow-auto rounded-xl border border-border-subtle bg-surface min-h-[32rem] max-h-[calc(100dvh-14rem)]">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className={reportTh}>{reportText("week", language)}</th>
                <th className={reportTh}>{reportText("subItem", language)}</th>
                <th className={reportTh}>{reportText("target", language)}</th>
                <th className={`${reportTh} text-center`}>{reportText("rate", language)}</th>
                <th className={reportTh}>{reportText("summary", language)}</th>
                <th className={reportTh}>{reportText("plan", language)}</th>
                {(canUpdate || canCreate) ? (
                  <th className={`${reportTh} text-center`}>{reportText("actions", language)}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filteredLines.length === 0 ? (
                <tr>
                  <td
                    colSpan={canUpdate || canCreate ? 7 : 6}
                    className={`${reportTd} py-12 text-center text-text-muted`}
                  >
                    {reportText("noLines", language)}
                  </td>
                </tr>
              ) : (
                filteredLines.map((row) => {
                  const target = localizedField(row.workTargetEn, row.workTargetCn, lang);
                  const summary = localizedField(row.summaryEn, row.summaryCn, lang);
                  const plan = localizedField(row.planEn, row.planCn, lang);
                  const subItem = localizedField(row.subItemNameEn, row.subItemNameCn, lang) || "—";
                  const editableWeek = rowCanEditWeek(row);

                  return (
                    <tr key={row.id} className="align-top">
                      <td className={reportTd}>
                        {row.weekNumber != null && row.year != null ? (
                          <WeekBadge
                            weekNumber={row.weekNumber}
                            year={row.year}
                            onClick={
                              editableWeek ? () => openEditWeek(row.weekNumber!) : undefined
                            }
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={reportTd}>
                        {editableWeek ? (
                          <button
                            type="button"
                            onClick={() => openEditWeek(row.weekNumber!)}
                            className="cursor-pointer text-left text-sm font-medium text-accent hover:underline"
                          >
                            {subItem}
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-accent">{subItem}</span>
                        )}
                      </td>
                      <td
                        className={`${reportTd} max-w-xs text-sm leading-relaxed text-text whitespace-pre-line`}
                      >
                        {target}
                      </td>
                      <td className={reportTd}>
                        <CompletionCell rate={row.weeklyCompletionRate} />
                      </td>
                      <td
                        className={`${reportTd} max-w-md text-sm leading-relaxed text-text-muted whitespace-pre-line`}
                      >
                        {summary}
                      </td>
                      <td
                        className={`${reportTd} max-w-md text-sm leading-relaxed text-text-muted whitespace-pre-line`}
                      >
                        {plan || "—"}
                      </td>
                      {(canUpdate || canCreate) && (
                        <td className={`${reportTd} text-center`}>
                          {editableWeek ? (
                            <button
                              type="button"
                              onClick={() => openEditWeek(row.weekNumber!)}
                              className="cursor-pointer text-xs text-accent hover:underline"
                            >
                              {reportText("editReport", language)}
                            </button>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )
      ) : null}

      {summaryFullscreenOpen ? (
        <SummaryFullViewWorkspace
          language={language}
          subtitle={summaryContextSubtitle}
          onExit={() => setSummaryFullscreenOpen(false)}
          filters={
            <SummaryFilterPanel
              {...summaryFilterPanelProps}
              fullViewActive
              onExitFullView={() => setSummaryFullscreenOpen(false)}
            />
          }
        >
          <SummaryTable
            weekGroups={weekGroups}
            areaById={areaById}
            language={language}
            controls={summaryTableControls}
            wrapperClassName="h-full overflow-auto rounded-xl border border-border-subtle bg-surface"
          />
        </SummaryFullViewWorkspace>
      ) : null}

      {weekFormOpen && areaId != null ? (
        <ReportWeekFormModal
          open={weekFormOpen}
          mode={weekFormMode}
          initialYear={year}
          initialWeekNumber={weekFormWeek}
          initialAreaId={areaId}
          areas={areas}
          subItems={subItems}
          weeks={weeks}
          canSave={weekFormMode === "create" ? canCreate : canUpdate}
          onClose={() => setWeekFormOpen(false)}
          onSaved={() => void handleWeekSaved()}
        />
      ) : null}

      {reopenConfirm ? (
        <ConfirmDialog
          title={reportText("reopen", language)}
          message={reportText("reopenConfirm", language)}
          confirmLabel={reportText("reopen", language)}
          busy={submitting}
          onConfirm={() => void reopenArea()}
          onCancel={() => setReopenConfirm(false)}
        />
      ) : null}
    </div>
  );
}
