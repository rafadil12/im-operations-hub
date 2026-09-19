"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { SkeletonTable } from "@/components/ui/skeletons";
import { useToast } from "@/components/ui/ToastProvider";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";
import {
  HEALTH_DOT_CLASS,
  emptyProjectLine,
  formatRatePercent,
  getWeekNumberForDate,
  healthLabel,
  lineStatusLabel,
  mergeSelectableWeekNumbers,
  projectText,
  type ReportProjectHealth,
  type ReportProjectLine,
  type ReportProjectLineStatus,
  type ReportProjectReport,
} from "@/lib/report";

type Mode = "closed" | "create" | "edit" | "view";

const field =
  "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent disabled:opacity-60";
const th = "px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-dim whitespace-nowrap";
const td = "px-2.5 py-2 align-top text-xs text-text-muted";
const YEAR_OPTIONS = [2025, 2026, 2027];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function progressToPercentInput(ratio: number | null): string {
  if (ratio == null) return "";
  return String(Math.round(ratio * 100));
}

function percentInputToRatio(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return Number.NaN;
  return Math.min(100, Math.max(0, num)) / 100;
}

function HealthDot({ health }: { health: ReportProjectHealth }) {
  return (
    <span
      className={`inline-block size-2.5 shrink-0 rounded-full ${HEALTH_DOT_CLASS[health]}`}
      aria-hidden
    />
  );
}

function HealthMix({
  counts,
}: {
  counts: ReportProjectReport["healthCounts"];
}) {
  const chips: ReportProjectHealth[] = [];
  for (let i = 0; i < counts.healthy; i += 1) chips.push("healthy");
  for (let i = 0; i < counts.mild; i += 1) chips.push("mild");
  for (let i = 0; i < counts.serious; i += 1) chips.push("serious");
  if (!chips.length) return <span className="text-text-dim">—</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {chips.map((h, i) => (
        <HealthDot key={`${h}-${i}`} health={h} />
      ))}
    </span>
  );
}

type FormState = {
  reportDate: string;
  projectDepartment: string;
  reporterName: string;
  year: number;
  weekNumber: number;
  cycleLabel: string;
  lines: ReportProjectLine[];
};

function emptyForm(lang: "en" | "cn"): FormState {
  const now = new Date();
  const year = now.getFullYear();
  const weekNumber = getWeekNumberForDate(now);
  const copy = projectText(lang);
  return {
    reportDate: todayIso(),
    projectDepartment: "",
    reporterName: "",
    year,
    weekNumber,
    cycleLabel: copy.weekLabel(weekNumber),
    lines: [emptyProjectLine(0)],
  };
}

function reportToForm(report: ReportProjectReport): FormState {
  return {
    reportDate: report.reportDate,
    projectDepartment: report.projectDepartment,
    reporterName: report.reporterName,
    year: report.year,
    weekNumber: report.weekNumber,
    cycleLabel: report.cycleLabel,
    lines: report.lines.length ? report.lines.map((l) => ({ ...l })) : [emptyProjectLine(0)],
  };
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

  const [mode, setMode] = useState<Mode>("closed");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(lang));
  const [saving, setSaving] = useState(false);
  const [deleteRow, setDeleteRow] = useState<ReportProjectReport | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = access.canCreateReportProject;
  const canUpdate = access.canUpdateReportProject;
  const canDelete = access.canDeleteReportProject;
  const readOnly = mode === "view";

  const weekOptions = useMemo(() => mergeSelectableWeekNumbers(year), [year]);
  const formWeekOptions = useMemo(
    () => mergeSelectableWeekNumbers(form.year),
    [form.year]
  );

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
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(lang));
    setMode("create");
  };

  const openReport = async (id: number, nextMode: "edit" | "view") => {
    try {
      const res = await apiGetAbs<{ success: boolean; data: ReportProjectReport; error?: string }>(
        `/api/report/projects/${id}`
      );
      if (!res.success || !res.data) throw new Error(res.error ?? copy.loadError);
      setEditingId(id);
      setForm(reportToForm(res.data));
      setMode(nextMode);
    } catch (err) {
      toastError(getApiErrorMessage(err) || copy.loadError);
    }
  };

  const closeModal = () => {
    if (saving) return;
    setMode("closed");
    setEditingId(null);
  };

  const setWeekOnForm = (weekNumber: number) => {
    setForm((prev) => ({
      ...prev,
      weekNumber,
      cycleLabel: projectText(lang).weekLabel(weekNumber),
    }));
  };

  const updateLine = (index: number, patch: Partial<ReportProjectLine>) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, emptyProjectLine(prev.lines.length)],
    }));
  };

  const removeLine = (index: number) => {
    setForm((prev) => {
      if (prev.lines.length <= 1) return prev;
      return { ...prev, lines: prev.lines.filter((_, i) => i !== index) };
    });
  };

  const save = async () => {
    if (readOnly) return;
    if (
      !form.reportDate.trim() ||
      !form.projectDepartment.trim() ||
      !form.reporterName.trim() ||
      !form.cycleLabel.trim()
    ) {
      toastError(copy.requiredHeader);
      return;
    }
    if (form.lines.some((l) => !l.target.trim())) {
      toastError(copy.requiredTarget);
      return;
    }

    const payloadLines = [];
    for (const line of form.lines) {
      const ratio = line.progressRatio;
      if (ratio != null && (!Number.isFinite(ratio) || ratio < 0 || ratio > 1)) {
        toastError(copy.invalidProgress);
        return;
      }
      payloadLines.push({
        target: line.target.trim(),
        mainTask: line.mainTask.trim() || null,
        currentPriority: line.currentPriority.trim() || null,
        planStart: line.planStart,
        planEnd: line.planEnd,
        health: line.health,
        lineStatus: line.lineStatus,
        progressRatio: ratio,
        pic: line.pic.trim() || null,
        thisWeekProgress: line.thisWeekProgress.trim() || null,
        nextWeekPlan: line.nextWeekPlan.trim() || null,
      });
    }

    const body = {
      reportDate: form.reportDate,
      projectDepartment: form.projectDepartment.trim(),
      reporterName: form.reporterName.trim(),
      cycleLabel: form.cycleLabel.trim(),
      year: form.year,
      weekNumber: form.weekNumber,
      lines: payloadLines,
    };

    setSaving(true);
    try {
      const url =
        mode === "edit" && editingId != null
          ? `/api/report/projects/${editingId}`
          : "/api/report/projects";
      const method = mode === "edit" && editingId != null ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? copy.saveError);
      toastSuccess(lang === "cn" ? "已保存" : "Saved");
      setMode("closed");
      setEditingId(null);
      await load();
    } catch (err) {
      toastError(getApiErrorMessage(err) || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/report/projects/${deleteRow.id}`, { method: "DELETE" });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? copy.deleteError);
      toastSuccess(lang === "cn" ? "已删除" : "Deleted");
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
            onChange={(e) => setYear(Number(e.target.value))}
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
              if (e.key === "Enter") setAppliedQ(q.trim());
            }}
            placeholder={copy.searchHint}
          />
        </div>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text hover:bg-surface-hover"
          onClick={() => setAppliedQ(q.trim())}
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
            <SkeletonTable rows={6} columns={6} />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-danger">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">
            {appliedQ || filterWeek !== "all" ? copy.emptyFiltered : copy.empty}
          </div>
        ) : (
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
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border-subtle">
                    <td className={td}>{copy.weekLabel(row.weekNumber)}</td>
                    <td className={td}>{row.reportDate}</td>
                    <td className={`${td} max-w-[240px]`}>
                      <div className="truncate text-text" title={row.projectDepartment}>
                        {row.projectDepartment}
                      </div>
                      <div className="text-[10px] text-text-dim">{row.cycleLabel}</div>
                    </td>
                    <td className={td}>{row.reporterName}</td>
                    <td className={td}>
                      <HealthMix counts={row.healthCounts} />
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
        )}
      </div>

      {mode !== "closed" ? (
        <Modal
          size="full"
          title={
            mode === "create"
              ? copy.add
              : mode === "edit"
                ? copy.edit
                : copy.view
          }
          subtitle={`${copy.weekLabel(form.weekNumber)} · ${form.reportDate || "—"}`}
          onClose={closeModal}
          closeDisabled={saving}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1.5 text-xs"
                onClick={closeModal}
                disabled={saving}
              >
                {copy.cancel}
              </button>
              {!readOnly ? (
                <button
                  type="button"
                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                  onClick={() => void save()}
                  disabled={saving}
                >
                  {saving ? t.common.loading : copy.save}
                </button>
              ) : null}
            </div>
          }
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-[10px] uppercase text-text-dim">
                  {copy.reportDate}
                </label>
                <input
                  type="date"
                  className={`${field} w-full`}
                  value={form.reportDate}
                  disabled={readOnly}
                  onChange={(e) => setForm((p) => ({ ...p, reportDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase text-text-dim">{copy.year}</label>
                <select
                  className={`${field} w-full`}
                  value={form.year}
                  disabled={readOnly}
                  onChange={(e) => {
                    const nextYear = Number(e.target.value);
                    const weeks = mergeSelectableWeekNumbers(nextYear);
                    const weekNumber = weeks.includes(form.weekNumber)
                      ? form.weekNumber
                      : (weeks[0] ?? 1);
                    setForm((p) => ({
                      ...p,
                      year: nextYear,
                      weekNumber,
                      cycleLabel: projectText(lang).weekLabel(weekNumber),
                    }));
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
                <label className="mb-1 block text-[10px] uppercase text-text-dim">{copy.cycle}</label>
                <select
                  className={`${field} w-full`}
                  value={form.weekNumber}
                  disabled={readOnly}
                  onChange={(e) => setWeekOnForm(Number(e.target.value))}
                >
                  {formWeekOptions.map((w) => (
                    <option key={w} value={w}>
                      {copy.weekLabel(w)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase text-text-dim">
                  {copy.reporter}
                </label>
                <input
                  className={`${field} w-full`}
                  value={form.reporterName}
                  disabled={readOnly}
                  onChange={(e) => setForm((p) => ({ ...p, reporterName: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="mb-1 block text-[10px] uppercase text-text-dim">
                  {copy.projectDepartment}
                </label>
                <input
                  className={`${field} w-full`}
                  value={form.projectDepartment}
                  disabled={readOnly}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, projectDepartment: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-text">{copy.progressSection}</div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <HealthDot health="healthy" /> {copy.legendHealthy}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <HealthDot health="mild" /> {copy.legendMild}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <HealthDot health="serious" /> {copy.legendSerious}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {form.lines.map((line, index) => (
                  <div
                    key={line.id ?? `new-${index}`}
                    className="rounded-lg border border-border-subtle bg-bg/30 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold text-text-dim">#{index + 1}</div>
                      {!readOnly && form.lines.length > 1 ? (
                        <button
                          type="button"
                          className="text-[11px] text-danger hover:underline"
                          onClick={() => removeLine(index)}
                        >
                          {copy.removeRow}
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      <div className="xl:col-span-2">
                        <label className="mb-1 block text-[10px] uppercase text-text-dim">
                          {copy.target}
                        </label>
                        <input
                          className={`${field} w-full`}
                          value={line.target}
                          disabled={readOnly}
                          onChange={(e) => updateLine(index, { target: e.target.value })}
                        />
                      </div>
                      <div className="xl:col-span-2">
                        <label className="mb-1 block text-[10px] uppercase text-text-dim">
                          {copy.mainTask}
                        </label>
                        <input
                          className={`${field} w-full`}
                          value={line.mainTask}
                          disabled={readOnly}
                          onChange={(e) => updateLine(index, { mainTask: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] uppercase text-text-dim">
                          {copy.priority}
                        </label>
                        <input
                          className={`${field} w-full`}
                          value={line.currentPriority}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateLine(index, { currentPriority: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] uppercase text-text-dim">
                          {copy.planStart}
                        </label>
                        <input
                          type="date"
                          className={`${field} w-full`}
                          value={line.planStart ?? ""}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateLine(index, {
                              planStart: e.target.value || null,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] uppercase text-text-dim">
                          {copy.planEnd}
                        </label>
                        <input
                          type="date"
                          className={`${field} w-full`}
                          value={line.planEnd ?? ""}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateLine(index, {
                              planEnd: e.target.value || null,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] uppercase text-text-dim">
                          {copy.health}
                        </label>
                        <select
                          className={`${field} w-full`}
                          value={line.health}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateLine(index, {
                              health: e.target.value as ReportProjectHealth,
                            })
                          }
                        >
                          <option value="healthy">{healthLabel("healthy", lang)}</option>
                          <option value="mild">{healthLabel("mild", lang)}</option>
                          <option value="serious">{healthLabel("serious", lang)}</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] uppercase text-text-dim">
                          {copy.status}
                        </label>
                        <select
                          className={`${field} w-full`}
                          value={line.lineStatus}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateLine(index, {
                              lineStatus: e.target.value as ReportProjectLineStatus,
                            })
                          }
                        >
                          <option value="in_progress">
                            {lineStatusLabel("in_progress", lang)}
                          </option>
                          <option value="completed">
                            {lineStatusLabel("completed", lang)}
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] uppercase text-text-dim">
                          {copy.progressRatio} (%)
                        </label>
                        <input
                          className={`${field} w-full`}
                          inputMode="numeric"
                          value={progressToPercentInput(line.progressRatio)}
                          disabled={readOnly}
                          onChange={(e) => {
                            const ratio = percentInputToRatio(e.target.value);
                            updateLine(index, {
                              progressRatio: Number.isNaN(ratio as number)
                                ? line.progressRatio
                                : ratio,
                            });
                          }}
                          placeholder={
                            line.progressRatio != null
                              ? formatRatePercent(line.progressRatio)
                              : "0–100"
                          }
                        />
                      </div>
                      <div className="md:col-span-2 xl:col-span-3">
                        <label className="mb-1 block text-[10px] uppercase text-text-dim">
                          {copy.pic}
                        </label>
                        <input
                          className={`${field} w-full`}
                          value={line.pic}
                          disabled={readOnly}
                          onChange={(e) => updateLine(index, { pic: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2 xl:col-span-2">
                        <label className="mb-1 block text-[10px] uppercase text-text-dim">
                          {copy.thisWeekProgress}
                        </label>
                        <textarea
                          className={`${field} min-h-[64px] w-full`}
                          value={line.thisWeekProgress}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateLine(index, { thisWeekProgress: e.target.value })
                          }
                        />
                      </div>
                      <div className="md:col-span-2 xl:col-span-2">
                        <label className="mb-1 block text-[10px] uppercase text-text-dim">
                          {copy.nextWeekPlan}
                        </label>
                        <textarea
                          className={`${field} min-h-[64px] w-full`}
                          value={line.nextWeekPlan}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateLine(index, { nextWeekPlan: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!readOnly ? (
                <button
                  type="button"
                  className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-hover"
                  onClick={addLine}
                >
                  + {copy.addRow}
                </button>
              ) : null}
            </div>
          </div>
        </Modal>
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
