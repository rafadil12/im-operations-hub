"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { SkeletonForm } from "@/components/ui/skeletons";
import { FullViewWorkspace } from "./FullViewWorkspace";
import { ReportWeekGrid } from "./ReportWeekGrid";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { localizedName, useLang } from "@/lib/i18n";
import {
  draftToPayload,
  lineToDraft,
  newWeekLineDraft,
  type ReportWeekLineDraft,
} from "@/lib/report/weekFormDraft";
import { validateWeekLineDraft } from "@/lib/report/weekFormValidation";
import { hasUnmatchedSubItem } from "@/lib/report/gridPaste";
import { completionBarColor } from "@/lib/report/completionColor";
import {
  reportText,
  type ReportArea,
  type ReportLanguage,
  type ReportLine,
  type ReportSubItem,
  type ReportWeek,
  type ReportWeekAttachment,
} from "@/lib/report";
import {
  ReportWeekAttachments,
  uploadPendingReportAttachments,
} from "./ReportWeekAttachments";

type ReportWeekFormModalProps = {
  open: boolean;
  mode: "create" | "edit" | "view";
  initialYear: number;
  initialWeekNumber: number;
  initialAreaId: number;
  areas: ReportArea[];
  subItems: ReportSubItem[];
  weeks: ReportWeek[];
  canSave: boolean;
  onClose: () => void;
  onSaved: () => void;
  onSubItemCreated?: (item: ReportSubItem) => void;
};

const identityField =
  "w-full rounded-lg border border-dashed border-border bg-bg/30 px-3 py-2.5 text-sm font-medium text-text outline-none disabled:cursor-default disabled:opacity-100";
const identityLabel =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-text-dim";

function SectionHeading({
  index,
  title,
  badge,
}: {
  index: string;
  title: string;
  badge?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex size-6 items-center justify-center rounded-md bg-accent/10 text-[10px] font-bold tabular-nums text-accent">
        {index}
      </span>
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {badge ? (
        <span className="rounded-full border border-border-subtle bg-bg/40 px-2 py-0.5 text-[10px] font-medium text-text-muted">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function AvgCompletionRing({ pct, label }: { pct: number; label: string }) {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const color = completionBarColor(clamped);

  return (
    <div className="flex items-center gap-2.5" title={`${label}: ${clamped}%`}>
      <div className="relative size-11 shrink-0">
        <svg className="size-11 -rotate-90" viewBox="0 0 44 44" aria-hidden>
          <circle
            cx="22"
            cy="22"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            className="text-border-subtle"
          />
          <circle
            cx="22"
            cy="22"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-text">
          {clamped}%
        </span>
      </div>
      <div className="hidden min-w-0 sm:block">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-text-dim">
          {label}
        </p>
      </div>
    </div>
  );
}

export function ReportWeekFormModal({
  open,
  mode: initialMode,
  initialYear,
  initialWeekNumber,
  initialAreaId,
  areas,
  subItems,
  canSave,
  onClose,
  onSaved,
  onSubItemCreated,
}: ReportWeekFormModalProps) {
  const { lang } = useLang();
  const language = lang as ReportLanguage;

  const [mode, setMode] = useState(initialMode);
  const [year, setYear] = useState(initialYear);
  const [weekNumber, setWeekNumber] = useState(initialWeekNumber);
  const [areaId, setAreaId] = useState(initialAreaId);
  const [lines, setLines] = useState<ReportWeekLineDraft[]>([newWeekLineDraft()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [savedAttachments, setSavedAttachments] = useState<ReportWeekAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachmentUploading, setAttachmentUploading] = useState(false);

  const areaSubItems = useMemo(
    () => subItems.filter((s) => s.areaId === areaId),
    [subItems, areaId]
  );

  const areaLabel = useMemo(() => {
    const area = areas.find((a) => a.id === areaId);
    return area
      ? localizedName({ name_en: area.nameEn, name_cn: area.nameCn }, lang)
      : String(areaId);
  }, [areas, areaId, lang]);

  const avgCompletionPct = useMemo(() => {
    if (!lines.length) return 0;
    const sum = lines.reduce((acc, line) => acc + (line.completionPct ?? 0), 0);
    return sum / lines.length;
  }, [lines]);

  const linesBadge =
    lines.length === 1
      ? reportText("lineCountOne", language)
      : reportText("linesCount", language).replace("{n}", String(lines.length));

  useEffect(() => {
    if (!open) return;
    // Reset form identity when the modal opens for a different week/area/mode.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync props into local draft state on open
    setMode(initialMode);
    setYear(initialYear);
    setWeekNumber(initialWeekNumber);
    setAreaId(initialAreaId);
    setError(null);
    setIsSubmitted(false);
    setSavedAttachments([]);
    setPendingFiles([]);
    setAttachmentUploading(false);

    if (initialMode === "create") {
      setLines([newWeekLineDraft()]);
      setSavedAttachments([]);
      setIsSubmitted(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    void (async () => {
      try {
        const qs = new URLSearchParams({
          year: String(initialYear),
          week: String(initialWeekNumber),
          areaId: String(initialAreaId),
        });
        const res = await apiGetAbs<{
          success: boolean;
          data: {
            lines: ReportLine[];
            submission: { status: "draft" | "submitted" } | null;
            attachments?: ReportWeekAttachment[];
          };
          error?: string;
        }>(`/api/report/week-lines?${qs}`);

        if (!res.success || !res.data) throw new Error(res.error ?? "Failed to load");
        setIsSubmitted(res.data.submission?.status === "submitted");
        setSavedAttachments(res.data.attachments ?? []);
        setLines(
          res.data.lines.length
            ? res.data.lines.map((row) => lineToDraft(row, lang))
            : [newWeekLineDraft()]
        );
      } catch (err) {
        setError(getApiErrorMessage(err));
        setLines([newWeekLineDraft()]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, initialMode, initialYear, initialWeekNumber, initialAreaId, lang]);

  const readOnly = mode === "view" || isSubmitted || !canSave;

  const handleSave = async () => {
    if (readOnly) return;

    const unmatched = lines.find(hasUnmatchedSubItem);
    if (unmatched) {
      setError(
        reportText("subItemNotFound", language).replace("{name}", unmatched.subItemLabel)
      );
      return;
    }

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.subItemId === "") {
        setError(reportText("subItemRequired", language));
        return;
      }
      const lineError = validateWeekLineDraft(line, i, language);
      if (lineError) {
        setError(lineError);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        year,
        weekNumber,
        areaId,
        mode: mode === "create" ? "create" : "update",
        lines: lines.map((line) => {
          const row = draftToPayload(line);
          if (mode === "create") {
            return {
              subItemId: row.subItemId,
              workTargetEn: row.workTargetEn,
              workTargetCn: row.workTargetCn,
              weeklyCompletionRate: row.weeklyCompletionRate,
              summaryEn: row.summaryEn,
              summaryCn: row.summaryCn,
              planEn: row.planEn,
              planCn: row.planCn,
            };
          }
          return row;
        }),
      };
      const res = await fetch("/api/report/week-lines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.status === 409) {
        throw new Error(reportText("reportAlreadyExists", language));
      }
      if (!res.ok || !json.success) throw new Error(json.error ?? "Save failed");

      // Lines are persisted — switch create → edit so attachment retry cannot 409.
      if (mode === "create") {
        setMode("edit");
      }

      if (pendingFiles.length) {
        setAttachmentUploading(true);
        const { succeeded, failed } = await uploadPendingReportAttachments(
          year,
          weekNumber,
          areaId,
          pendingFiles
        );
        if (succeeded.length) {
          setSavedAttachments((prev) => [...prev, ...succeeded]);
        }
        setPendingFiles(failed);
        setAttachmentUploading(false);

        onSaved();
        if (failed.length) {
          setError(reportText("attachmentPartialFail", language));
          return;
        }
        onClose();
        return;
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
      setAttachmentUploading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <AlertDialog
        open={Boolean(error)}
        title={reportText("errorTitle", language)}
        message={error ?? ""}
        confirmLabel={reportText("ok", language)}
        onClose={() => setError(null)}
      />

      <FullViewWorkspace
        language={language}
        title={
          mode === "create"
            ? reportText("addReport", language)
            : mode === "view"
              ? reportText("viewReport", language)
              : reportText("editReport", language)
        }
        subtitle={
          mode === "view"
            ? reportText("viewReportSubtitle", language)
            : reportText("addReportSubtitle", language)
        }
        ariaLabel={
          mode === "create"
            ? reportText("addReport", language)
            : mode === "view"
              ? reportText("viewReport", language)
              : reportText("editReport", language)
        }
        onExit={onClose}
        exitDisabled={saving}
        exitButtonVariant="close"
        headerAside={
          loading ? null : (
            <AvgCompletionRing
              pct={avgCompletionPct}
              label={reportText("avgCompletion", language)}
            />
          )
        }
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="cursor-pointer rounded-md border border-border px-4 py-2 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-50"
            >
              Cancel
            </button>
            {!readOnly ? (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || loading}
                className="cursor-pointer rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {saving ? reportText("loading", language) : reportText("saveWeekReport", language)}
              </button>
            ) : null}
          </>
        }
      >
        {loading ? (
          <SkeletonForm fields={4} />
        ) : (
          <div className="mx-auto w-full max-w-[86rem] space-y-6">
            <section className="rounded-xl border border-border-subtle bg-surface p-4 sm:p-5">
              <SectionHeading
                index="01"
                title={reportText("reportInformation", language)}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={identityLabel}>{reportText("year", language)}</label>
                  <input className={identityField} value={year} disabled readOnly />
                </div>
                <div>
                  <label className={identityLabel}>{reportText("week", language)}</label>
                  <input
                    className={identityField}
                    value={`Week ${weekNumber}`}
                    disabled
                    readOnly
                  />
                </div>
                <div>
                  <label className={identityLabel}>
                    {reportText("reportCategory", language)}
                  </label>
                  <input className={identityField} value={areaLabel} disabled readOnly />
                </div>
              </div>
              {isSubmitted ? (
                <p className="mt-3 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
                  {reportText("submitted", language)}
                </p>
              ) : null}
            </section>

            <section className="rounded-xl border border-border-subtle bg-surface p-4 sm:p-5">
              <SectionHeading
                index="02"
                title={reportText("subItemsSection", language)}
                badge={linesBadge}
              />
              <ReportWeekGrid
                language={language}
                lines={lines}
                areaId={areaId}
                areaSubItems={areaSubItems}
                readOnly={readOnly}
                onChange={setLines}
                onSubItemCreated={onSubItemCreated}
              />
            </section>

            <section className="rounded-xl border border-border-subtle bg-surface p-4 sm:p-5">
              <SectionHeading index="03" title={reportText("attachments", language)} />
              <ReportWeekAttachments
                language={language}
                readOnly={readOnly}
                year={year}
                weekNumber={weekNumber}
                areaId={areaId}
                savedAttachments={savedAttachments}
                pendingFiles={pendingFiles}
                uploading={attachmentUploading || saving}
                onSavedAttachmentsChange={setSavedAttachments}
                onPendingFilesChange={setPendingFiles}
                onUploadingChange={setAttachmentUploading}
                onError={setError}
                uploadImmediately={mode === "edit"}
              />
            </section>
          </div>
        )}
      </FullViewWorkspace>
    </>
  );
}
