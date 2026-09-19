"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SkeletonTable } from "@/components/ui/skeletons";
import { useToast } from "@/components/ui/ToastProvider";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";
import {
  getWeekNumberForDate,
  HEALTH_DOT_CLASS,
  healthLabel,
  mergeSelectableWeekNumbers,
  projectText,
  worstHealthFromCounts,
  type ReportProjectAttachment,
  type ReportProjectReport,
} from "@/lib/report";
import { ProjectReportDetailDrawer } from "./ProjectReportDetailDrawer";
import {
  emptyProjectForm,
  ProjectReportFormDrawer,
  reportToForm,
  type ProjectFormState,
} from "./ProjectReportFormDrawer";

type Mode = "closed" | "create" | "edit" | "view";

const field =
  "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent disabled:opacity-60";
const th = "px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-dim whitespace-nowrap";
const td = "px-2.5 py-2 align-top text-xs text-text-muted";
const YEAR_OPTIONS = [2025, 2026, 2027];
const PAGE_SIZE = 10;

function HealthCell({
  counts,
  lang,
}: {
  counts: ReportProjectReport["healthCounts"];
  lang: "en" | "cn";
}) {
  const worst = worstHealthFromCounts(counts);
  if (!worst) return <span className="text-text-dim">—</span>;
  const title = `Healthy ${counts.healthy} · Watch ${counts.mild} · Critical ${counts.serious}`;
  return (
    <span className="inline-flex items-center gap-1.5" title={title}>
      <span className={`inline-block size-2.5 shrink-0 rounded-full ${HEALTH_DOT_CLASS[worst]}`} />
      <span className="text-text">{healthLabel(worst, lang)}</span>
    </span>
  );
}

export function ReportProjectsClient() {
  const { lang, t } = useLang();
  const copy = projectText(lang);
  const access = useRoleAccess();
  const { success: toastSuccess, error: toastError } = useToast();

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [filterWeek, setFilterWeek] = useState<number | "all">("all");
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [rows, setRows] = useState<ReportProjectReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [mode, setMode] = useState<Mode>("closed");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProjectFormState>(() => emptyProjectForm(lang));
  const [viewReport, setViewReport] = useState<ReportProjectReport | null>(null);
  const [formAttachments, setFormAttachments] = useState<ReportProjectAttachment[]>([]);
  const [viewAttachments, setViewAttachments] = useState<ReportProjectAttachment[]>([]);
  const [deleteRow, setDeleteRow] = useState<ReportProjectReport | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = access.canCreateReportProject;
  const canUpdate = access.canUpdateReportProject;
  const canDelete = access.canDeleteReportProject;

  const weekOptions = useMemo(() => mergeSelectableWeekNumbers(year), [year]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("year", String(year));
      if (filterWeek !== "all") qs.set("week", String(filterWeek));
      if (appliedQ) qs.set("q", appliedQ);

      const res = await apiGetAbs<{ success: boolean; data: ReportProjectReport[]; error?: string }>(
        `/api/report/projects?${qs.toString()}`
      );
      if (!res.success) throw new Error(res.error ?? copy.loadError);
      setRows(res.data ?? []);
      setError(null);
    } catch (err) {
      setRows([]);
      setError(getApiErrorMessage(err) || copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [year, filterWeek, appliedQ, copy.loadError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client fetch
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, currentPage]);
  const from = rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, rows.length);

  const loadAttachments = async (reportId: number) => {
    const res = await apiGetAbs<{
      success: boolean;
      data: ReportProjectAttachment[];
      error?: string;
    }>(`/api/report/project-attachments?reportId=${reportId}`);
    if (!res.success) throw new Error(res.error ?? copy.loadError);
    return res.data ?? [];
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyProjectForm(lang));
    setFormAttachments([]);
    setViewReport(null);
    setMode("create");
  };

  const openReport = async (id: number, nextMode: "edit" | "view") => {
    try {
      const res = await apiGetAbs<{ success: boolean; data: ReportProjectReport; error?: string }>(
        `/api/report/projects/${id}`
      );
      if (!res.success || !res.data) throw new Error(res.error ?? copy.loadError);
      const attachments = await loadAttachments(id);
      setEditingId(id);
      if (nextMode === "view") {
        setViewReport(res.data);
        setViewAttachments(attachments);
        setMode("view");
      } else {
        setForm(reportToForm(res.data));
        setFormAttachments(attachments);
        setViewReport(null);
        setMode("edit");
      }
    } catch (err) {
      toastError(getApiErrorMessage(err) || copy.loadError);
    }
  };

  const closeDrawer = () => {
    setMode("closed");
    setEditingId(null);
    setViewReport(null);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/report/projects/${deleteRow.id}`, { method: "DELETE" });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? copy.deleteError);
      toastSuccess(copy.deleted);
      setDeleteRow(null);
      await load();
    } catch (err) {
      toastError(getApiErrorMessage(err) || copy.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  const jumpToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setFilterWeek(getWeekNumberForDate(now));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text">{copy.title}</h1>
        <p className="text-sm text-text-muted">{copy.desc}</p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border-subtle bg-surface p-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase text-text-dim">{copy.year}</label>
          <select
            className={field}
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setPage(1);
            }}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase text-text-dim">{copy.week}</label>
          <select
            className={field}
            value={filterWeek === "all" ? "all" : String(filterWeek)}
            onChange={(e) => {
              const v = e.target.value;
              setFilterWeek(v === "all" ? "all" : Number(v));
              setPage(1);
            }}
          >
            <option value="all">{copy.allWeeks}</option>
            {weekOptions.map((w) => (
              <option key={w} value={w}>
                {copy.weekLabel(w)}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-[10px] uppercase text-text-dim">{copy.search}</label>
          <input
            className={`${field} w-full`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setAppliedQ(q.trim());
                setPage(1);
              }
            }}
            placeholder={copy.searchHint}
          />
        </div>
        <button
          type="button"
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          onClick={() => {
            setAppliedQ(q.trim());
            setPage(1);
          }}
        >
          {t.common.apply}
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text hover:bg-surface-hover"
          onClick={jumpToday}
        >
          {copy.today}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
          <div className="text-sm font-medium text-text">
            {copy.listTitle} · {year}
          </div>
          {canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              + {copy.add}
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={6} columns={7} />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-danger">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">
            {appliedQ || filterWeek !== "all" ? copy.emptyFiltered : copy.empty}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-bg/60">
                  <tr>
                    <th className={`${th} text-left`}>{copy.week}</th>
                    <th className={`${th} text-left`}>{copy.reportDate}</th>
                    <th className={`${th} text-left`}>{copy.projectDepartment}</th>
                    <th className={`${th} text-left`}>{copy.reporter}</th>
                    <th className={`${th} text-left`}>{copy.healthMix}</th>
                    <th className={`${th} text-left`}>{copy.lines}</th>
                    <th className={`${th} text-right`}>{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row) => (
                    <tr key={row.id} className="border-t border-border-subtle">
                      <td className={td}>{copy.weekShort(row.weekNumber)}</td>
                      <td className={td}>{row.reportDate}</td>
                      <td className={`${td} max-w-[240px]`}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="truncate text-text"
                            title={row.projectDepartment}
                          >
                            {row.projectDepartment}
                          </span>
                          {row.status === "draft" ? (
                            <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-text-dim">
                              {copy.statusDraft}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className={td}>{row.reporterName}</td>
                      <td className={td}>
                        <HealthCell counts={row.healthCounts} lang={lang} />
                      </td>
                      <td className={td}>{row.lineCount}</td>
                      <td className={`${td} text-right`}>
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          <button
                            type="button"
                            className="rounded border border-border px-2 py-1 text-[11px] hover:bg-surface-hover"
                            onClick={() => void openReport(row.id, "view")}
                          >
                            {copy.view}
                          </button>
                          {canUpdate ? (
                            <button
                              type="button"
                              className="rounded border border-border px-2 py-1 text-[11px] hover:bg-surface-hover"
                              onClick={() => void openReport(row.id, "edit")}
                            >
                              {copy.edit}
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              className="rounded border border-danger/40 px-2 py-1 text-[11px] text-danger hover:bg-danger/10"
                              onClick={() => setDeleteRow(row)}
                            >
                              {copy.delete}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 py-2.5 text-[11px] text-text-muted">
              <span>{copy.showingCount(from, to, rows.length)}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t.common.previous}
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t.common.next}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {mode === "create" || mode === "edit" ? (
        <ProjectReportFormDrawer
          key={mode === "create" ? "create" : `edit-${editingId}`}
          mode={mode}
          lang={lang}
          reportId={editingId}
          initialForm={form}
          initialAttachments={formAttachments}
          onClose={closeDrawer}
          onSaved={() => void load()}
          onError={toastError}
          onSuccess={toastSuccess}
        />
      ) : null}

      {mode === "view" && viewReport ? (
        <ProjectReportDetailDrawer
          lang={lang}
          report={viewReport}
          attachments={viewAttachments}
          onClose={closeDrawer}
        />
      ) : null}

      {deleteRow ? (
        <ConfirmDialog
          title={copy.deleteConfirm}
          message={copy.deleteConfirmBody}
          busy={deleting}
          confirmLabel={copy.delete}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            if (!deleting) setDeleteRow(null);
          }}
        />
      ) : null}
    </div>
  );
}
