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
import {
  reportText,
  type ReportArea,
  type ReportLanguage,
  type ReportLine,
  type ReportSubItem,
  type ReportWeek,
  type ReportWeekAttachment,
} from "@/lib/report";
import { mergeSelectableWeekNumbers } from "@/lib/report/weekCalendar";
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

const field =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-1 text-sm text-text outline-none focus:border-accent";
const label = "mb-1 block text-xs font-medium text-text-muted";

export function ReportWeekFormModal({
  open,
  mode,
  initialYear,
  initialWeekNumber,
  initialAreaId,
  areas,
  subItems,
  weeks,
  canSave,
  onClose,
  onSaved,
  onSubItemCreated,
}: ReportWeekFormModalProps) {
  const { lang } = useLang();
  const language = lang as ReportLanguage;

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

  const weekOptions = useMemo(() => {
    const options = mergeSelectableWeekNumbers(
      year,
      weeks.filter((w) => w.year === year).map((w) => w.weekNumber)
    );
    if (Number.isInteger(weekNumber) && !options.includes(weekNumber)) {
      return [weekNumber, ...options].sort((a, b) => b - a);
    }
    return options;
  }, [year, weeks, weekNumber]);

  useEffect(() => {
    if (!open) return;
    setYear(initialYear);
    setWeekNumber(initialWeekNumber);
    setAreaId(initialAreaId);
    setError(null);
    setIsSubmitted(false);
    setSavedAttachments([]);
    setPendingFiles([]);
    setAttachmentUploading(false);

    if (mode === "create") {
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
  }, [open, mode, initialYear, initialWeekNumber, initialAreaId, lang]);

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

      if (pendingFiles.length) {
        await uploadPendingReportAttachments(year, weekNumber, areaId, pendingFiles);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
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
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs text-text-muted disabled:opacity-50"
            >
              Cancel
            </button>
            {!readOnly ? (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || loading}
                className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={label}>{reportText("year", language)}</label>
                <select
                  className={field}
                  value={year}
                  disabled
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {[2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>{reportText("week", language)}</label>
                <select
                  className={field}
                  value={weekNumber}
                  disabled
                  onChange={(e) => setWeekNumber(Number(e.target.value))}
                >
                  {weekOptions.map((w) => (
                    <option key={w} value={w}>
                      Week {w}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>{reportText("reportCategory", language)}</label>
                <select
                  className={field}
                  value={areaId}
                  disabled
                  onChange={(e) => {
                    const nextAreaId = Number(e.target.value);
                    setAreaId(nextAreaId);
                    setLines((prev) =>
                      prev.map((l) => ({ ...l, subItemId: "", subItemLabel: "" }))
                    );
                  }}
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {localizedName({ name_en: a.nameEn, name_cn: a.nameCn }, lang)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isSubmitted ? (
              <p className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
                {reportText("submitted", language)}
              </p>
            ) : null}

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

            <ReportWeekGrid
              language={language}
              lines={lines}
              areaId={areaId}
              areaSubItems={areaSubItems}
              readOnly={readOnly}
              onChange={setLines}
              onSubItemCreated={onSubItemCreated}
            />
          </div>
        )}
      </FullViewWorkspace>
    </>
  );
}
