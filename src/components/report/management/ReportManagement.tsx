"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { localizedField, localizedName, useLang } from "@/lib/i18n";
import {
  areaColor,
  reportText,
  type ReportArea,
  type ReportSubItem,
  type ReportLanguage,
  type ReportLine,
  type ReportWeek,
} from "@/lib/report";
import { completionBarColor } from "@/lib/report/completionColor";
import { ReportWeekFormModal } from "./ReportWeekFormModal";

const filterCtrl =
  "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";

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
    <div className="mx-auto flex w-full max-w-[88px] flex-col items-center gap-1.5">
      <span className="text-xs font-semibold" style={{ color: fillColor }}>
        {pct}%
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${clamped}%`, backgroundColor: fillColor }}
        />
      </div>
    </div>
  );
}

export function ReportManagement() {
  const { lang } = useLang();
  const language = lang as ReportLanguage;
  const access = useRoleAccess();
  const { success: toastSuccess, error: toastError } = useToast();

  const [year, setYear] = useState(new Date().getFullYear());
  const [areaId, setAreaId] = useState<number | "">("");
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
  const [weekFormWeek, setWeekFormWeek] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [reopenConfirm, setReopenConfirm] = useState(false);

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
    if (!areaId) {
      setLines([]);
      setSubmissionStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        year: String(year),
        areaId: String(areaId),
      });
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

      if (selectedWeek) {
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
  }, [year, areaId, selectedWeek, language]);

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
    if (areaId === "" && areas.length) {
      setAreaId(areas[0].id);
    }
  }, [areas, areaId]);

  useEffect(() => {
    setFilterWeek("all");
    setFilterSubItem("all");
    setSearch("");
  }, [areaId, year]);

  const weekOptions = useMemo(() => {
    const fromLines = new Set<number>();
    lines.forEach((line) => {
      if (line.weekNumber != null) fromLines.add(line.weekNumber);
    });
    weeks.forEach((w) => fromLines.add(w.weekNumber));
    return Array.from(fromLines).sort((a, b) => b - a);
  }, [lines, weeks]);

  const filteredLines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter((row) => {
      if (filterWeek !== "all" && row.weekNumber !== filterWeek) return false;
      if (filterSubItem !== "all" && row.subItemId !== filterSubItem) return false;
      if (!q) return true;

      const haystack = [
        localizedField(row.subItemNameEn, row.subItemNameCn, lang),
        localizedField(row.workTargetEn, row.workTargetCn, lang),
        localizedField(row.summaryEn, row.summaryCn, lang),
        localizedField(row.planEn, row.planCn, lang),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [lines, filterWeek, filterSubItem, search, lang]);

  const openCreateWeek = () => {
    setWeekFormMode("create");
    setWeekFormWeek(selectedWeekFilter ?? "");
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

  return (
    <div className="space-y-0">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <select
          className={filterCtrl + " w-auto"}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label={reportText("year", language)}
        >
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
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
            disabled={!areaId}
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
      </div>

      <div className="overflow-x-auto border-b border-border-subtle">
        <div className="flex min-w-max gap-6">
          {areas.map((area) => {
            const active = areaId === area.id;
            const color = areaColor(area.code);
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => setAreaId(area.id)}
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

      <div className="flex flex-wrap items-end gap-3 py-4">
        <div className="relative min-w-[240px] flex-1">
          <SearchIcon />
          <input
            type="search"
            className="w-full rounded-md border border-border bg-bg/40 py-2 pl-9 pr-3 text-sm text-text outline-none placeholder:text-text-dim focus:border-accent"
            placeholder={reportText("searchPlaceholder", language)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-w-[120px]">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-text-dim">
            {reportText("week", language)}
          </label>
          <select
            className={filterCtrl + " w-full min-w-[120px]"}
            value={filterWeek === "all" ? "all" : String(filterWeek)}
            onChange={(e) =>
              setFilterWeek(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">{reportText("all", language)}</option>
            {weekOptions.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-text-dim">
            {reportText("subItem", language)}
          </label>
          <select
            className={filterCtrl + " w-full min-w-[160px]"}
            value={filterSubItem === "all" ? "all" : String(filterSubItem)}
            onChange={(e) =>
              setFilterSubItem(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">{reportText("all", language)}</option>
            {subItems.map((c) => (
              <option key={c.id} value={c.id}>
                {localizedName({ name_en: c.nameEn, name_cn: c.nameCn }, lang)}
              </option>
            ))}
          </select>
        </div>
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
        <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-bg/20 text-[10px] uppercase tracking-wide text-text-dim">
                <th className="px-4 py-3 font-semibold">{reportText("week", language)}</th>
                <th className="px-4 py-3 font-semibold">{reportText("subItem", language)}</th>
                <th className="px-4 py-3 font-semibold">{reportText("target", language)}</th>
                <th className="px-4 py-3 text-center font-semibold">{reportText("rate", language)}</th>
                <th className="px-4 py-3 font-semibold">{reportText("summary", language)}</th>
                <th className="px-4 py-3 font-semibold">{reportText("plan", language)}</th>
                {(canUpdate || canCreate) && (
                  <th className="px-4 py-3 text-center font-semibold">{reportText("actions", language)}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredLines.length === 0 ? (
                <tr>
                  <td
                    colSpan={canUpdate || canCreate ? 7 : 6}
                    className="px-4 py-12 text-center text-text-muted"
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
                    <tr key={row.id} className="border-b border-border-subtle/70 align-top">
                      <td className="px-4 py-4">
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
                      <td className="px-4 py-4">
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
                      <td className="max-w-xs px-4 py-4 text-sm leading-relaxed text-text whitespace-pre-line">
                        {target}
                      </td>
                      <td className="px-4 py-4">
                        <CompletionCell rate={row.weeklyCompletionRate} />
                      </td>
                      <td className="max-w-md px-4 py-4 text-sm leading-relaxed text-text-muted whitespace-pre-line">
                        {summary}
                      </td>
                      <td className="max-w-md px-4 py-4 text-sm leading-relaxed text-text-muted whitespace-pre-line">
                        {plan || "—"}
                      </td>
                      {(canUpdate || canCreate) && (
                        <td className="px-4 py-4 text-center">
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
      ) : null}

      {weekFormOpen && areaId !== "" ? (
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
