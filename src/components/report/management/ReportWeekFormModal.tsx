"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { FullViewWorkspace } from "./FullViewWorkspace";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { localizedName, useLang } from "@/lib/i18n";
import {
  draftToPayload,
  lineToDraft,
  MAX_WEEK_REPORT_LINES,
  newWeekLineDraft,
  usedSubItemIds,
  type ReportWeekLineDraft,
} from "@/lib/report/weekFormDraft";
import { validateWeekLineDraft } from "@/lib/report/weekFormValidation";
import { completionBarColor } from "@/lib/report/completionColor";
import {
  reportCnText,
  reportEnText,
  reportText,
  type ReportArea,
  type ReportLanguage,
  type ReportLine,
  type ReportSubItem,
  type ReportWeek,
} from "@/lib/report";
import { mergeSelectableWeekNumbers } from "@/lib/report/weekCalendar";

type ReportWeekFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialYear: number;
  initialWeekNumber: number;
  initialAreaId: number;
  areas: ReportArea[];
  subItems: ReportSubItem[];
  weeks: ReportWeek[];
  canSave: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const field =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-sm text-text outline-none focus:border-accent";
const label = "mb-1 block text-xs font-medium text-text-muted";
const section =
  "rounded-lg border border-border-subtle bg-bg/30 p-3 space-y-3";

const textareaField =
  "w-full resize-none overflow-hidden rounded-md border border-border bg-bg/40 px-3 py-2 text-sm leading-5 text-text outline-none focus:border-accent";

function AutoExpandTextarea({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const minHeight = 56; // 2 lines (leading-5) + vertical padding
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  return (
    <textarea
      ref={ref}
      rows={2}
      className={textareaField}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        onChange(e.target.value);
        syncHeight();
      }}
    />
  );
}

function BilingualFieldRow({
  labelEn,
  labelCn,
  en,
  cn,
  onEnChange,
  onCnChange,
  placeholderEn,
  placeholderCn,
  disabled,
}: {
  labelEn: string;
  labelCn: string;
  en: string;
  cn: string;
  onEnChange: (value: string) => void;
  onCnChange: (value: string) => void;
  placeholderEn: string;
  placeholderCn: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="min-w-0">
        <label className={label}>{labelEn}</label>
        <AutoExpandTextarea
          value={en}
          placeholder={placeholderEn}
          disabled={disabled}
          onChange={onEnChange}
        />
      </div>
      <div className="min-w-0">
        <label className={label}>{labelCn}</label>
        <AutoExpandTextarea
          value={cn}
          placeholder={placeholderCn}
          disabled={disabled}
          onChange={onCnChange}
        />
      </div>
    </div>
  );
}

function CompletionSlider({
  value,
  onChange,
  language,
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  language: ReportLanguage;
  disabled?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const fillColor = completionBarColor(pct);

  return (
    <div className="flex h-full flex-col justify-center">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={label + " mb-0 shrink-0"}>
          {reportText("rate", language)} — {pct}%
        </span>
        {!disabled ? (
          <div className="flex shrink-0 gap-1">
            {[0, 10, 25, 50, 80, 100].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange(preset)}
                className={[
                  "cursor-pointer rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                  pct === preset
                    ? "ring-1 ring-inset"
                    : "border border-border text-text-muted hover:bg-surface-hover",
                ].join(" ")}
                style={
                  pct === preset
                    ? {
                        backgroundColor: `${completionBarColor(preset)}22`,
                        color: completionBarColor(preset),
                        borderColor: completionBarColor(preset),
                      }
                    : undefined
                }
              >
                {preset}%
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="relative flex h-5 w-full items-center">
        <div className="pointer-events-none absolute inset-x-0 h-2 rounded-full bg-border-subtle" />
        <div
          className="pointer-events-none absolute left-0 h-2 rounded-full transition-[width,background-color] duration-300 ease-out"
          style={{ width: `${pct}%`, backgroundColor: fillColor }}
        />
        <div
          className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm transition-[left,background-color] duration-300 ease-out"
          style={{ left: `${pct}%`, backgroundColor: fillColor }}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          disabled={disabled}
          aria-label={reportText("rate", language)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

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

  const areaSubItems = useMemo(
    () => subItems.filter((s) => s.areaId === areaId),
    [subItems, areaId]
  );

  const weekOptions = useMemo(
    () =>
      mergeSelectableWeekNumbers(
        year,
        weeks.filter((w) => w.year === year).map((w) => w.weekNumber)
      ),
    [year, weeks]
  );

  useEffect(() => {
    if (!open) return;
    setYear(initialYear);
    setWeekNumber(initialWeekNumber);
    setAreaId(initialAreaId);
    setError(null);
    setIsSubmitted(false);

    if (mode === "create") {
      setLines([newWeekLineDraft()]);
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
          };
          error?: string;
        }>(`/api/report/week-lines?${qs}`);

        if (!res.success || !res.data) throw new Error(res.error ?? "Failed to load");
        setIsSubmitted(res.data.submission?.status === "submitted");
        setLines(
          res.data.lines.length
            ? res.data.lines.map((row) => lineToDraft(row))
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

  useEffect(() => {
    if (!weekOptions.length) return;
    if (!weekOptions.includes(weekNumber)) {
      setWeekNumber(weekOptions[0]);
    }
  }, [weekOptions, weekNumber]);

  const readOnly = isSubmitted || !canSave;

  const handleSave = async () => {
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
        lines: lines.map((line) => draftToPayload(line)),
      };
      const res = await fetch("/api/report/week-lines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Save failed");
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
          mode === "create" ? reportText("addReport", language) : reportText("editReport", language)
        }
        subtitle={reportText("addReportSubtitle", language)}
        ariaLabel={
          mode === "create" ? reportText("addReport", language) : reportText("editReport", language)
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
        <div className="py-12 text-center text-sm text-text-muted">{reportText("loading", language)}</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={label}>{reportText("year", language)}</label>
              <select
                className={field}
                value={year}
                disabled={mode === "edit" || readOnly}
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
                disabled={mode === "edit" || readOnly}
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
              <label className={label}>{reportText("module", language)}</label>
              <select
                className={field}
                value={areaId}
                disabled={mode === "edit" || readOnly}
                onChange={(e) => {
                  const nextAreaId = Number(e.target.value);
                  setAreaId(nextAreaId);
                  setLines((prev) => prev.map((l) => ({ ...l, subItemId: "" })));
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

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">{reportText("subItem", language)}</h3>
              {!readOnly ? (
                <button
                  type="button"
                  disabled={lines.length >= MAX_WEEK_REPORT_LINES}
                  title={
                    lines.length >= MAX_WEEK_REPORT_LINES
                      ? reportText("maxLinesReached", language)
                      : undefined
                  }
                  onClick={() =>
                    setLines((prev) =>
                      prev.length >= MAX_WEEK_REPORT_LINES ? prev : [...prev, newWeekLineDraft()]
                    )
                  }
                  className="cursor-pointer rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + {reportText("addLine", language)}
                </button>
              ) : null}
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => {
                const taken = usedSubItemIds(lines, line.key);
                return (
                  <div key={line.key} className={section}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-text-dim">
                        #{index + 1}
                      </span>
                      {!readOnly && lines.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                          className="cursor-pointer text-xs text-danger hover:underline"
                        >
                          {reportText("removeLine", language)}
                        </button>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(0,240px)_1fr]">
                      <div className="min-w-0 max-w-full md:max-w-[240px]">
                        <label className={label}>{reportText("subItem", language)} *</label>
                        <select
                          className={field}
                          value={line.subItemId}
                          disabled={readOnly}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key
                                  ? {
                                      ...l,
                                      subItemId:
                                        e.target.value === "" ? "" : Number(e.target.value),
                                    }
                                  : l
                              )
                            )
                          }
                        >
                          <option value="">—</option>
                          {areaSubItems.map((item) => (
                            <option
                              key={item.id}
                              value={item.id}
                              disabled={taken.has(item.id) && line.subItemId !== item.id}
                            >
                              {localizedName({ name_en: item.nameEn, name_cn: item.nameCn }, lang)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <CompletionSlider
                        value={line.completionPct}
                        language={language}
                        disabled={readOnly}
                        onChange={(next) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.key === line.key ? { ...l, completionPct: next } : l
                            )
                          )
                        }
                      />
                    </div>

                    <BilingualFieldRow
                      labelEn={reportText("targetEn", language)}
                      labelCn={reportText("targetCn", language)}
                      en={line.targetEn}
                      cn={line.targetCn}
                      placeholderEn={reportEnText("targetPlaceholderEn")}
                      placeholderCn={reportCnText("targetPlaceholderCn")}
                      disabled={readOnly}
                      onEnChange={(targetEn) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === line.key ? { ...l, targetEn } : l))
                        )
                      }
                      onCnChange={(targetCn) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === line.key ? { ...l, targetCn } : l))
                        )
                      }
                    />

                    <BilingualFieldRow
                      labelEn={reportText("summaryEn", language)}
                      labelCn={reportText("summaryCn", language)}
                      en={line.summaryEn}
                      cn={line.summaryCn}
                      placeholderEn={reportEnText("summaryPlaceholderEn")}
                      placeholderCn={reportCnText("summaryPlaceholderCn")}
                      disabled={readOnly}
                      onEnChange={(summaryEn) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === line.key ? { ...l, summaryEn } : l))
                        )
                      }
                      onCnChange={(summaryCn) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === line.key ? { ...l, summaryCn } : l))
                        )
                      }
                    />

                    <BilingualFieldRow
                      labelEn={reportText("planEn", language)}
                      labelCn={reportText("planCn", language)}
                      en={line.planEn}
                      cn={line.planCn}
                      placeholderEn={reportEnText("planPlaceholderEn")}
                      placeholderCn={reportCnText("planPlaceholderCn")}
                      disabled={readOnly}
                      onEnChange={(planEn) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === line.key ? { ...l, planEn } : l))
                        )
                      }
                      onCnChange={(planCn) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === line.key ? { ...l, planCn } : l))
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </FullViewWorkspace>
    </>
  );
}
