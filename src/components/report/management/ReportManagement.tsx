"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { localizedField, localizedName, useLang } from "@/lib/i18n";
import {
  areaColor,
  buildAreaWeekReportRows,
  getWeekNumberForDate,
  groupLinesByWeek,
  mergeSelectableWeekNumbers,
  reportText,
  type AreaWeekReportRow,
  type ReportArea,
  type ReportSubItem,
  type ReportLanguage,
  type ReportLine,
  type ReportWeek,
  type ReportWeekAttachment,
} from "@/lib/report";
import { SkeletonTable } from "@/components/ui/skeletons";
import { buildAttachmentMap } from "@/lib/report/attachmentLookup";
import { ReportAttachmentsModal } from "./ReportAttachmentsModal";
import { ReportWeekFormModal } from "./ReportWeekFormModal";
import { SummaryFilterPanel } from "./SummaryFilterPanel";
import { SummaryFullViewWorkspace } from "./SummaryFullViewWorkspace";
import { SummaryTable } from "./SummaryTable";
import { useSummaryTableControls } from "./useSummaryTableControls";
import { WeekReportList } from "./WeekReportList";

const filterCtrl =
  "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";

type ActiveTab = number | "summary";

export type ReportManagementMode = "summary" | "reports";

type ReportFilterBarProps = {
  language: ReportLanguage;
  year: number;
  onYearChange: (year: number) => void;
  filterWeek: number | "all";
  onFilterWeekChange: (value: number | "all") => void;
  weekOptions: number[];
  onToday: () => void;
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
  year,
  onYearChange,
  filterWeek,
  onFilterWeekChange,
  weekOptions,
  onToday,
}: ReportFilterBarProps) {
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
            <option value="all">{reportText("allWeeks", language)}</option>
            {weekOptions.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </FilterField>
        <button
          type="button"
          onClick={onToday}
          className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover"
        >
          {reportText("today", language)}
        </button>
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
  const [attachments, setAttachments] = useState<ReportWeekAttachment[]>([]);
  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false);
  const [attachmentsModalItems, setAttachmentsModalItems] = useState<ReportWeekAttachment[]>([]);
  const [attachmentsModalTitle, setAttachmentsModalTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekFormOpen, setWeekFormOpen] = useState(false);
  const [weekFormMode, setWeekFormMode] = useState<"create" | "edit" | "view">("create");
  const [weekFormWeek, setWeekFormWeek] = useState(getWeekNumberForDate());
  const [submitting, setSubmitting] = useState(false);
  const [reopenWeekNumber, setReopenWeekNumber] = useState<number | null>(null);
  const [deleteWeekRow, setDeleteWeekRow] = useState<AreaWeekReportRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [summaryFullscreenOpen, setSummaryFullscreenOpen] = useState(false);

  const isSummary = mode === "summary";
  const areaId = isSummary || typeof activeTab !== "number" ? null : activeTab;
  const canCreate = access.canCreateReportLine;
  const canUpdate = access.canUpdateReportLine;
  const canDelete = access.canDeleteReportLine;
  const canSubmit = access.canSubmitReport;
  const canReopen = access.canReopenReport;

  const loadWeeks = useCallback(async () => {
    const res = await apiGetAbs<{ success: boolean; data: ReportWeek[] }>(
      `/api/report/weeks?year=${year}`
    );
    if (res.success && res.data) setWeeks(res.data);
  }, [year]);

  const loadLines = useCallback(async () => {
    if (!areas.length && !isSummary) {
      setLines([]);
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
        attachments?: ReportWeekAttachment[];
        error?: string;
      }>(`/api/report/lines?${qs}`);

      if (!res.success) throw new Error(res.error ?? "Failed");
      setLines(res.data ?? []);
      setAttachments(res.attachments ?? []);
      if (res.areas) setAreas(res.areas);
      if (res.subItems) setSubItems(res.subItems);
    } catch (err) {
      setError(getApiErrorMessage(err) || reportText("errorLoad", language));
      setLines([]);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [year, areaId, isSummary, language, areas.length]);

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
    setWeekFormOpen(false);
    setReopenWeekNumber(null);
    setDeleteWeekRow(null);
  }, [activeTab, year]);

  const weekOptions = useMemo(
    () => mergeSelectableWeekNumbers(year, weeks.map((w) => w.weekNumber)),
    [year, weeks]
  );

  const areaById = useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas]);

  const attachmentMap = useMemo(() => buildAttachmentMap(attachments), [attachments]);

  const openAttachmentsModal = useCallback(
    (items: ReportWeekAttachment[], title: string) => {
      setAttachmentsModalItems(items);
      setAttachmentsModalTitle(title);
      setAttachmentsModalOpen(true);
    },
    []
  );

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

  const areaWeekRows = useMemo(() => {
    if (isSummary) return [];
    const weekNumbers =
      filterWeek === "all" ? weekOptions : weekOptions.includes(filterWeek) ? [filterWeek] : [filterWeek];
    return buildAreaWeekReportRows({
      year,
      weekNumbers,
      lines: lines.filter((line) => (filterWeek === "all" ? true : line.weekNumber === filterWeek)),
    });
  }, [isSummary, weekOptions, filterWeek, year, lines]);

  const weekGroups = useMemo(
    () => (isSummary ? groupLinesByWeek(filteredLines, areas) : []),
    [isSummary, filteredLines, areas]
  );

  const summaryTableControls = useSummaryTableControls({
    year,
    weekGroups,
    areaById,
    attachmentMap,
    language,
  });

  const selectedArea = areaId != null ? areaById.get(areaId) ?? null : null;

  const openCreateWeek = (weekNumber: number) => {
    const existing = areaWeekRows.find((row) => row.weekNumber === weekNumber);
    if (existing && existing.status !== "none") {
      toastError(reportText("reportAlreadyExists", language));
      return;
    }
    setWeekFormMode("create");
    setWeekFormWeek(weekNumber);
    setWeekFormOpen(true);
  };

  const openEditWeek = (weekNumber: number) => {
    setWeekFormMode("edit");
    setWeekFormWeek(weekNumber);
    setWeekFormOpen(true);
  };

  const openViewWeek = (weekNumber: number) => {
    setWeekFormMode("view");
    setWeekFormWeek(weekNumber);
    setWeekFormOpen(true);
  };

  const jumpToToday = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentWeek = getWeekNumberForDate(now);
    if (year !== currentYear) setYear(currentYear);
    setFilterWeek(currentWeek);
  };

  const deleteWeekReport = async () => {
    if (!deleteWeekRow) return;
    setDeleting(true);
    try {
      for (const line of deleteWeekRow.lines) {
        const res = await fetch(`/api/report/lines/${line.id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? "Delete failed");
      }
      toastSuccess(reportText("deleteSuccess", language));
      setDeleteWeekRow(null);
      await loadLines();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const submitWeek = async (weekNumber: number) => {
    if (!areaId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/report/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          weekNumber,
          areaId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Submit failed");
      toastSuccess(reportText("submitSuccess", language));
      await loadLines();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const reopenWeek = async () => {
    if (!areaId || reopenWeekNumber == null) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/report/submissions/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          weekNumber: reopenWeekNumber,
          areaId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Reopen failed");
      toastSuccess(reportText("reopenSuccess", language));
      setReopenWeekNumber(null);
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

  const listTitle = reportText("weeklyReportsFor", language)
    .replace(
      "{area}",
      selectedArea
        ? localizedName({ name_en: selectedArea.nameEn, name_cn: selectedArea.nameCn }, lang)
        : ""
    )
    .replace("{year}", String(year));

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
          <ReportFilterBar
            language={language}
            year={year}
            onYearChange={setYear}
            filterWeek={filterWeek}
            onFilterWeekChange={setFilterWeek}
            weekOptions={weekOptions}
            onToday={jumpToToday}
          />
        )}
      </div>

      {!isSummary ? (
        <p className="mb-4 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-xs text-text-muted">
          {reportText("oneReportRule", language)}
        </p>
      ) : null}

      {loading ? (
        <SkeletonTable />
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
            attachmentMap={attachmentMap}
            onViewAttachments={openAttachmentsModal}
            wrapperClassName="overflow-auto rounded-xl border border-border-subtle bg-surface min-h-[32rem] max-h-[calc(100dvh-14rem)]"
          />
        ) : (
          <WeekReportList
            language={language}
            lang={lang}
            title={listTitle}
            rows={areaWeekRows}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
            canSubmit={canSubmit}
            canReopen={canReopen}
            submitting={submitting}
            onAdd={openCreateWeek}
            onEdit={openEditWeek}
            onView={openViewWeek}
            onDelete={setDeleteWeekRow}
            onSubmit={(weekNumber) => void submitWeek(weekNumber)}
            onReopen={setReopenWeekNumber}
          />
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
            attachmentMap={attachmentMap}
            onViewAttachments={openAttachmentsModal}
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
          canSave={
            weekFormMode === "view"
              ? false
              : weekFormMode === "create"
                ? canCreate
                : canUpdate
          }
          onClose={() => setWeekFormOpen(false)}
          onSaved={() => void handleWeekSaved()}
          onSubItemCreated={(item) => {
            setSubItems((prev) =>
              prev.some((s) => s.id === item.id) ? prev : [...prev, item]
            );
          }}
        />
      ) : null}

      {reopenWeekNumber != null ? (
        <ConfirmDialog
          title={reportText("reopen", language)}
          message={reportText("reopenConfirm", language)}
          confirmLabel={reportText("reopen", language)}
          busy={submitting}
          onConfirm={() => void reopenWeek()}
          onCancel={() => setReopenWeekNumber(null)}
        />
      ) : null}

      {deleteWeekRow ? (
        <ConfirmDialog
          title={reportText("delete", language)}
          message={reportText("deleteConfirm", language)}
          busy={deleting}
          onConfirm={() => void deleteWeekReport()}
          onCancel={() => setDeleteWeekRow(null)}
        />
      ) : null}

      <ReportAttachmentsModal
        open={attachmentsModalOpen}
        onClose={() => setAttachmentsModalOpen(false)}
        attachments={attachmentsModalItems}
        language={language}
        title={attachmentsModalTitle}
      />
    </div>
  );
}
