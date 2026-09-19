"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { getApiErrorMessage } from "@/lib/apiClient";
import {
  emptyProjectLine,
  formatRatePercent,
  getWeekNumberForDate,
  healthLabel,
  lineStatusLabel,
  mergeSelectableWeekNumbers,
  projectText,
  type ReportProjectAttachment,
  type ReportProjectHealth,
  type ReportProjectLine,
  type ReportProjectLineStatus,
  type ReportProjectReport,
  type ReportProjectStatus,
} from "@/lib/report";
import type { Lang } from "@/lib/types";
import {
  ProjectReportAttachments,
  uploadPendingProjectAttachments,
} from "./ProjectReportAttachments";

const field =
  "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent disabled:opacity-60";
const sectionTitle = "text-sm font-semibold text-text";
const labelCls = "mb-1 block text-[10px] uppercase tracking-wide text-text-dim";
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

export type ProjectFormState = {
  reportDate: string;
  projectDepartment: string;
  reporterName: string;
  year: number;
  weekNumber: number;
  cycleLabel: string;
  lines: ReportProjectLine[];
};

export function emptyProjectForm(lang: Lang): ProjectFormState {
  const now = new Date();
  const year = now.getFullYear();
  const weekNumber = getWeekNumberForDate(now);
  return {
    reportDate: todayIso(),
    projectDepartment: "",
    reporterName: "",
    year,
    weekNumber,
    cycleLabel: projectText(lang).weekLabel(weekNumber),
    lines: [emptyProjectLine(0)],
  };
}

export function reportToForm(report: ReportProjectReport): ProjectFormState {
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

type ProjectReportFormModalProps = {
  mode: "create" | "edit";
  lang: Lang;
  reportId: number | null;
  initialForm: ProjectFormState;
  initialAttachments?: ReportProjectAttachment[];
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function ProjectReportFormModal({
  mode,
  lang,
  reportId,
  initialForm,
  initialAttachments = [],
  onClose,
  onSaved,
  onError,
  onSuccess,
}: ProjectReportFormModalProps) {
  const copy = projectText(lang);
  const [form, setForm] = useState<ProjectFormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [savedAttachments, setSavedAttachments] =
    useState<ReportProjectAttachment[]>(initialAttachments);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeReportId, setActiveReportId] = useState<number | null>(reportId);

  const formWeekOptions = useMemo(
    () => mergeSelectableWeekNumbers(form.year),
    [form.year]
  );

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

  const save = async (status: ReportProjectStatus) => {
    if (
      !form.reportDate.trim() ||
      !form.projectDepartment.trim() ||
      !form.reporterName.trim() ||
      !form.cycleLabel.trim()
    ) {
      onError(copy.requiredHeader);
      return;
    }
    if (form.lines.some((l) => !l.target.trim())) {
      onError(copy.requiredTarget);
      return;
    }

    const payloadLines = [];
    for (const line of form.lines) {
      const ratio = line.progressRatio;
      if (ratio != null && (!Number.isFinite(ratio) || ratio < 0 || ratio > 1)) {
        onError(copy.invalidProgress);
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
      status,
      lines: payloadLines,
    };

    setSaving(true);
    try {
      const isEdit = mode === "edit" && activeReportId != null;
      const url = isEdit ? `/api/report/projects/${activeReportId}` : "/api/report/projects";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: ReportProjectReport;
      };
      if (!res.ok || !json.success) throw new Error(json.error ?? copy.saveError);

      const newId = json.data?.id ?? activeReportId;
      if (newId != null && pendingFiles.length > 0) {
        setUploading(true);
        const { failed } = await uploadPendingProjectAttachments(newId, pendingFiles);
        setUploading(false);
        if (failed.length > 0) {
          onError(copy.saveError);
          setActiveReportId(newId);
          setPendingFiles(failed);
          onSaved();
          return;
        }
        setPendingFiles([]);
      }

      onSuccess(copy.saved);
      onSaved();
      onClose();
    } catch (err) {
      onError(getApiErrorMessage(err) || copy.saveError);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const busy = saving || uploading;

  return (
    <Modal
      size="2xl"
      title={mode === "create" ? copy.addTitle : copy.editTitle}
      subtitle={`${copy.weekShort(form.weekNumber)} · ${form.reportDate || "—"}`}
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-xs text-text-muted hover:bg-surface-hover hover:text-text"
            onClick={onClose}
            disabled={busy}
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            className={
              mode === "create"
                ? "rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-hover disabled:opacity-60"
                : "rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            }
            onClick={() => void save("draft")}
            disabled={busy}
          >
            {mode === "create" ? copy.saveDraft : copy.saveChanges}
          </button>
          <button
            type="button"
            className={
              mode === "create"
                ? "rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                : "rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-hover disabled:opacity-60"
            }
            onClick={() => void save("submitted")}
            disabled={busy}
          >
            {busy ? "…" : copy.submit}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Report Information */}
        <section className="space-y-3">
          <h3 className={sectionTitle}>{copy.reportInformation}</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>
                {copy.year} <span className="text-danger">*</span>
              </label>
              <select
                className={`${field} w-full`}
                value={form.year}
                disabled={busy}
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
              <label className={labelCls}>
                {copy.week} <span className="text-danger">*</span>
              </label>
              <select
                className={`${field} w-full`}
                value={form.weekNumber}
                disabled={busy}
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
              <label className={labelCls}>
                {copy.reportDate} <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className={`${field} w-full`}
                value={form.reportDate}
                disabled={busy}
                onChange={(e) => setForm((p) => ({ ...p, reportDate: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>
                {copy.projectDepartment} <span className="text-danger">*</span>
              </label>
              <input
                className={`${field} w-full`}
                value={form.projectDepartment}
                disabled={busy}
                onChange={(e) =>
                  setForm((p) => ({ ...p, projectDepartment: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelCls}>
                {copy.reporter} <span className="text-danger">*</span>
              </label>
              <input
                className={`${field} w-full`}
                value={form.reporterName}
                disabled={busy}
                onChange={(e) => setForm((p) => ({ ...p, reporterName: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* Project Targets + Weekly Update + Status & Health per line */}
        <section className="space-y-3">
          <h3 className={sectionTitle}>{copy.projectTargets}</h3>

          <div className="space-y-4">
            {form.lines.map((line, index) => (
              <div
                key={line.id ?? `new-${index}`}
                className="space-y-4 rounded-lg border border-border-subtle bg-bg/20 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-text">
                    {copy.target} {index + 1}
                  </div>
                  {form.lines.length > 1 ? (
                    <button
                      type="button"
                      className="text-[11px] text-danger hover:underline"
                      onClick={() => removeLine(index)}
                      disabled={busy}
                      aria-label={copy.removeRow}
                    >
                      {copy.removeRow}
                    </button>
                  ) : null}
                </div>

                <div>
                  <label className={labelCls}>{copy.target}</label>
                  <textarea
                    className={`${field} min-h-[64px] w-full`}
                    value={line.target}
                    disabled={busy}
                    maxLength={500}
                    onChange={(e) => updateLine(index, { target: e.target.value })}
                  />
                  <div className="mt-0.5 text-right text-[10px] text-text-dim">
                    {line.target.length}/500
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>{copy.mainTask}</label>
                    <input
                      className={`${field} w-full`}
                      value={line.mainTask}
                      disabled={busy}
                      onChange={(e) => updateLine(index, { mainTask: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{copy.priority}</label>
                    <input
                      className={`${field} w-full`}
                      value={line.currentPriority}
                      disabled={busy}
                      onChange={(e) =>
                        updateLine(index, { currentPriority: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{copy.pic}</label>
                    <input
                      className={`${field} w-full`}
                      value={line.pic}
                      disabled={busy}
                      onChange={(e) => updateLine(index, { pic: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{copy.planStart}</label>
                    <input
                      type="date"
                      className={`${field} w-full`}
                      value={line.planStart ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        updateLine(index, { planStart: e.target.value || null })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{copy.planEnd}</label>
                    <input
                      type="date"
                      className={`${field} w-full`}
                      value={line.planEnd ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        updateLine(index, { planEnd: e.target.value || null })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{copy.progressRatio} (%)</label>
                    <input
                      className={`${field} w-full`}
                      inputMode="numeric"
                      value={progressToPercentInput(line.progressRatio)}
                      disabled={busy}
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
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold text-text">{copy.weeklyUpdate}</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>{copy.thisWeekProgress}</label>
                      <textarea
                        className={`${field} min-h-[88px] w-full`}
                        value={line.thisWeekProgress}
                        disabled={busy}
                        maxLength={1000}
                        onChange={(e) =>
                          updateLine(index, { thisWeekProgress: e.target.value })
                        }
                      />
                      <div className="mt-0.5 text-right text-[10px] text-text-dim">
                        {line.thisWeekProgress.length}/1000
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>{copy.nextWeekPlan}</label>
                      <textarea
                        className={`${field} min-h-[88px] w-full`}
                        value={line.nextWeekPlan}
                        disabled={busy}
                        maxLength={1000}
                        onChange={(e) =>
                          updateLine(index, { nextWeekPlan: e.target.value })
                        }
                      />
                      <div className="mt-0.5 text-right text-[10px] text-text-dim">
                        {line.nextWeekPlan.length}/1000
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold text-text">{copy.statusHealth}</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>{copy.health}</label>
                      <div className="flex flex-wrap gap-2">
                        {(["healthy", "mild", "serious"] as ReportProjectHealth[]).map(
                          (h) => {
                            const selected = line.health === h;
                            const tone =
                              h === "healthy"
                                ? selected
                                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-700"
                                  : "border-border text-text-muted hover:border-emerald-500/50"
                                : h === "mild"
                                  ? selected
                                    ? "border-amber-400 bg-amber-400/15 text-amber-700"
                                    : "border-border text-text-muted hover:border-amber-400/50"
                                  : selected
                                    ? "border-rose-500 bg-rose-500/15 text-rose-700"
                                    : "border-border text-text-muted hover:border-rose-500/50";
                            return (
                              <button
                                key={h}
                                type="button"
                                disabled={busy}
                                onClick={() => updateLine(index, { health: h })}
                                className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium ${tone}`}
                              >
                                {healthLabel(h, lang)}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>{copy.status}</label>
                      <select
                        className={`${field} w-full`}
                        value={line.lineStatus}
                        disabled={busy}
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
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-text-muted hover:border-accent hover:bg-accent/5 hover:text-accent disabled:opacity-60"
            onClick={addLine}
            disabled={busy}
          >
            + {copy.addTarget}
          </button>
        </section>

        <ProjectReportAttachments
          lang={lang}
          readOnly={false}
          reportId={activeReportId}
          savedAttachments={savedAttachments}
          pendingFiles={pendingFiles}
          uploading={uploading}
          onSavedAttachmentsChange={setSavedAttachments}
          onPendingFilesChange={setPendingFiles}
          onUploadingChange={setUploading}
          onError={onError}
        />
      </div>
    </Modal>
  );
}
