"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { localizedField, localizedName, useLang } from "@/lib/i18n";
import {
  areaColor,
  isProjectLine,
  projectStatus,
  reportText,
  splitTargetLines,
  type ReportLanguage,
  type ReportLine,
  type ReportOverviewMetrics,
} from "@/lib/report";
import { getWeekNumberForDate, weekLabel } from "@/lib/report/weekCalendar";
import { ProgressRingItem } from "@/components/overview/ModuleCardShared";
import { DivisionRateBar, ReportOverviewKpiCard } from "./ReportOverviewParts";
import { ReportWeeklyTrendChart } from "./ReportWeeklyTrendChart";

function StatusBadge({
  status,
  language,
}: {
  status: ReportOverviewMetrics["currentWeekStatus"];
  language: ReportLanguage;
}) {
  const label =
    status === "on_target"
      ? reportText("onTarget", language)
      : status === "above_target"
        ? reportText("aboveTarget", language)
        : reportText("belowTarget", language);

  const classes =
    status === "below_target"
      ? "border-rose-400/30 bg-rose-500/12 text-rose-300"
      : status === "above_target"
        ? "border-emerald-400/30 bg-emerald-500/12 text-emerald-300"
        : "border-amber-400/30 bg-amber-500/12 text-amber-300";

  return (
    <span className={`rounded-md border px-3 py-1.5 text-xs font-medium ${classes}`}>{label}</span>
  );
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-semibold text-text">{value}</span>
    </div>
  );
}

type RecentLineStatusTier = "complete" | "warning" | "exception";

function recentLineStatusTier(line: ReportLine): RecentLineStatusTier {
  const rate = line.weeklyCompletionRate;
  if (rate != null && Number.isFinite(rate) && rate >= 1) return "complete";
  if (isProjectLine(line) && projectStatus(rate) === "delayed") return "exception";
  if (rate == null || !Number.isFinite(rate)) return "exception";
  return "warning";
}

function recentLineNeedsAttention(line: ReportLine): boolean {
  const rate = line.weeklyCompletionRate;
  if (rate == null || !Number.isFinite(rate)) return true;
  return rate < 1;
}

const RECENT_TARGET_LINE_LIMIT = 2;

function RecentTargetCell({ text, language }: { text: string; language: ReportLanguage }) {
  const lines = splitTargetLines(text);
  if (!lines.length) return <span className="text-text-dim">—</span>;

  const visibleLines = lines.slice(0, RECENT_TARGET_LINE_LIMIT);
  const hiddenCount = lines.length - RECENT_TARGET_LINE_LIMIT;

  return (
    <div>
      <span className="block whitespace-pre-line text-sm leading-snug text-inherit">
        {visibleLines.join("\n")}
      </span>
      {hiddenCount > 0 ? (
        <span className="mt-0.5 block text-[11px] font-medium text-text-muted">
          {reportText("showMore", language).replace("{n}", String(hiddenCount))}
        </span>
      ) : null}
    </div>
  );
}

function RecentLineStatusBadge({ line, language }: { line: ReportLine; language: ReportLanguage }) {
  const rate = line.weeklyCompletionRate;
  const pct = rate != null && Number.isFinite(rate) ? Math.round(rate * 100) : null;
  const tier = recentLineStatusTier(line);

  if (tier === "complete") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/20 bg-emerald-500/8 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-300/90">
        <span aria-hidden>✓</span>
        100%
      </span>
    );
  }

  const isProject = isProjectLine(line);
  const projectLabel =
    isProject && rate != null && rate < 1
      ? projectStatus(rate) === "delayed"
        ? reportText("delayed", language)
        : projectStatus(rate) === "at_risk"
          ? reportText("atRisk", language)
          : null
      : null;

  const badgeClass =
    tier === "exception"
      ? "border-amber-400/35 bg-amber-500/12 text-amber-300"
      : "border-amber-400/25 bg-amber-500/8 text-amber-300/90";

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${badgeClass}`}
      >
        {tier === "exception" ? <span aria-hidden>⚠</span> : null}
        {pct != null ? `${pct}%` : "—"}
      </span>
      {projectLabel ? (
        <span className="text-[10px] font-medium text-amber-300/80">{projectLabel}</span>
      ) : null}
    </div>
  );
}

const editablePickerClass =
  "group/field relative flex cursor-text items-center justify-center gap-1 rounded-md border border-dashed border-border bg-bg/40 px-2.5 py-1.5 transition hover:border-accent/50 hover:bg-bg/60 focus-within:border-accent focus-within:bg-bg/60 focus-within:ring-2 focus-within:ring-accent/20";

const editableInputClass =
  "bg-transparent text-center text-sm font-semibold text-text caret-accent outline-none placeholder:font-normal placeholder:text-text-dim [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function PickerEditIcon() {
  return (
    <svg
      aria-hidden
      className="size-3 shrink-0 text-text-dim transition group-hover/field:text-accent group-focus-within/field:text-accent"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M13.586 3.586a2 2 0 0 1 2.828 2.828l-9.5 9.5a1 1 0 0 1-.389.242l-3.5 1a1 1 0 0 1-1.213-1.213l1-3.5a1 1 0 0 1 .242-.389l9.5-9.5z" />
    </svg>
  );
}

export function ReportOverview() {
  const { lang } = useLang();
  const language = lang as ReportLanguage;
  const initialYear = new Date().getFullYear();
  const initialWeek = getWeekNumberForDate(new Date());

  const [year, setYear] = useState(initialYear);
  const [draftYear, setDraftYear] = useState<number | "">(initialYear);
  const [weekNumber, setWeekNumber] = useState(initialWeek);
  const [draftWeek, setDraftWeek] = useState<number | "">(initialWeek);
  const [metrics, setMetrics] = useState<ReportOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(
    (targetYear: number, targetWeek: number, signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      return apiGetAbs<{ success: boolean; data: ReportOverviewMetrics; error?: string }>(
        `/api/report/overview?year=${targetYear}&week=${targetWeek}`,
        { signal }
      )
        .then((res) => {
          if (!res.success || !res.data) throw new Error(res.error ?? "Failed");
          setMetrics(res.data);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(getApiErrorMessage(err) || reportText("errorLoad", language));
          setMetrics(null);
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [language]
  );

  useEffect(() => {
    const ac = new AbortController();
    loadMetrics(year, weekNumber, ac.signal);
    return () => ac.abort();
  }, [year, weekNumber, loadMetrics]);

  const clampWeek = (value: number) => Math.min(53, Math.max(1, Math.round(value)));
  const clampYear = (value: number) => Math.min(2100, Math.max(2000, Math.round(value)));

  const goWeek = (delta: number) => {
    setWeekNumber((current) => {
      const next = clampWeek(current + delta);
      setDraftWeek(next);
      return next;
    });
  };

  const applyWeek = () => {
    if (draftWeek === "" || !Number.isFinite(Number(draftWeek))) {
      setDraftWeek(weekNumber);
      return;
    }
    const next = clampWeek(Number(draftWeek));
    setDraftWeek(next);
    setWeekNumber(next);
  };

  const applyYear = () => {
    if (draftYear === "" || !Number.isFinite(Number(draftYear))) {
      setDraftYear(year);
      return;
    }
    const next = clampYear(Number(draftYear));
    setDraftYear(next);
    setYear(next);
  };

  const weekRangeLabel =
    metrics != null
      ? `${metrics.weekStartsOn} – ${metrics.weekEndsOn}`
      : reportText("weekRange", language);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">{reportText("overviewTitle", language)}</h1>
          <p className="mt-1 text-sm text-text-muted">{reportText("overviewDesc", language)}</p>
          <p className="mt-1 text-xs text-text-dim">{weekRangeLabel}</p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goWeek(-1)}
                className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-muted hover:bg-surface-hover"
                aria-label={reportText("previousWeek", language)}
              >
                ‹
              </button>
              <label
                className={`${editablePickerClass} min-w-[104px]`}
                title={reportText("weekTypeHint", language)}
              >
                {language === "cn" ? null : (
                  <span className="shrink-0 text-xs text-text-muted">{reportText("week", language)}</span>
                )}
                <input
                  type="number"
                  min={1}
                  max={53}
                  placeholder="36"
                  aria-label={reportText("weekInputAria", language)}
                  title={reportText("weekTypeHint", language)}
                  className={`${editableInputClass} w-11`}
                  value={draftWeek}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setDraftWeek("");
                      return;
                    }
                    const num = Number(raw);
                    if (Number.isFinite(num)) setDraftWeek(num);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyWeek();
                  }}
                  onBlur={applyWeek}
                />
                {language === "cn" ? (
                  <span className="shrink-0 text-xs text-text-muted">{reportText("week", language)}</span>
                ) : null}
                <PickerEditIcon />
              </label>
              <button
                type="button"
                onClick={() => goWeek(1)}
                className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-muted hover:bg-surface-hover"
                aria-label={reportText("nextWeek", language)}
              >
                ›
              </button>
            </div>

            <label
              className={`${editablePickerClass} min-w-[96px]`}
              title={reportText("weekTypeHint", language)}
            >
              {language === "cn" ? null : (
                <span className="shrink-0 text-xs text-text-muted">{reportText("year", language)}</span>
              )}
              <input
                type="number"
                min={2000}
                max={2100}
                placeholder="2026"
                aria-label={reportText("yearInputAria", language)}
                title={reportText("weekTypeHint", language)}
                className={`${editableInputClass} w-14`}
                value={draftYear}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setDraftYear("");
                    return;
                  }
                  const num = Number(raw);
                  if (Number.isFinite(num)) setDraftYear(num);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyYear();
                }}
                onBlur={applyYear}
              />
              {language === "cn" ? (
                <span className="shrink-0 text-xs text-text-muted">{reportText("year", language)}</span>
              ) : null}
              <PickerEditIcon />
            </label>
          </div>
          <p className="text-[10px] text-text-dim">{reportText("weekTypeHint", language)}</p>
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

      {metrics && !loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <ReportOverviewKpiCard
              title={reportText("achievement", language)}
              snapshot={metrics.achievement}
              tone={metrics.achievement.value >= 90 ? "success" : "warning"}
              subtitle={reportText("vsPreviousWeek", language)}
            />
            <ReportOverviewKpiCard
              title={reportText("workCompletion", language)}
              snapshot={metrics.workCompletion}
              subtitle={reportText("vsPreviousWeek", language)}
            />
            {metrics.projectProgress ? (
              <ReportOverviewKpiCard
                title={reportText("projectProgress", language)}
                snapshot={metrics.projectProgress}
                tone={metrics.projectProgress.value >= 90 ? "success" : "warning"}
                subtitle={reportText("vsPreviousWeek", language)}
              />
            ) : (
              <div className="rounded-xl border border-border-subtle bg-surface p-4">
                <p className="text-[10px] uppercase tracking-wide text-text-dim">
                  {reportText("projectProgress", language)}
                </p>
                <p className="mt-3 text-sm text-text-muted">{reportText("noActiveProjects", language)}</p>
              </div>
            )}
            <ReportOverviewKpiCard
              title={reportText("onTimeRate", language)}
              snapshot={metrics.onTimeRate}
              subtitle={reportText("vsPreviousWeek", language)}
            />
            <ReportOverviewKpiCard
              title={reportText("reportCompletion", language)}
              snapshot={metrics.reportCompletion}
              tone={metrics.reportCompletion.value >= 100 ? "success" : "warning"}
              subtitle={reportText("vsPreviousWeek", language)}
            />
            <ReportOverviewKpiCard
              title={reportText("reportLinesKpi", language)}
              snapshot={metrics.reportLineCount}
              suffix=""
              tone="default"
              subtitle={reportText("vsPreviousWeek", language)}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-3 text-sm font-medium text-text">
                {reportText("workTrend", language)}
              </h2>
              {metrics.weeklyTrend.length > 0 ? (
                <ReportWeeklyTrendChart
                  data={metrics.weeklyTrend}
                  workLabel={reportText("workCompletion", language)}
                  projectLabel={reportText("projectTrend", language)}
                />
              ) : (
                <p className="py-8 text-center text-sm text-text-muted">{reportText("noLines", language)}</p>
              )}
            </section>

            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-text">{reportText("currentWeek", language)}</h2>
                  <p className="mt-1 text-xs text-text-dim">{weekLabel(metrics.weekNumber, language)}</p>
                </div>
                <StatusBadge status={metrics.currentWeekStatus} language={language} />
              </div>

              <div className="space-y-3">
                <StatRow
                  label={reportText("achievement", language)}
                  value={`${metrics.achievement.value}%`}
                />
                <StatRow
                  label={reportText("submittedAreas", language)}
                  value={`${metrics.submittedCount} / ${metrics.submittedCount + metrics.draftCount || metrics.byArea.length}`}
                />
                <StatRow label={reportText("reportLinesKpi", language)} value={metrics.totalLines} />
              </div>

              <div className="mt-5 border-t border-border-subtle pt-4">
                <h3 className="mb-3 text-xs font-medium text-text-muted">
                  {reportText("byArea", language)}
                </h3>
                <div className="flex flex-wrap items-center justify-around gap-3">
                  {metrics.byArea.map((area) => (
                    <ProgressRingItem
                      key={area.areaId}
                      ring={{
                        label: localizedName({ name_en: area.nameEn, name_cn: area.nameCn }, lang),
                        value: area.avgCompletionRate,
                        color: areaColor(area.code),
                      }}
                    />
                  ))}
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-border-subtle bg-surface p-4">
            <h2 className="mb-4 text-sm font-medium text-text">
              {reportText("divisionPerformance", language)} — {weekLabel(metrics.weekNumber, language)}
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {metrics.divisions.map((division, index) => (
                <div key={division.areaId} className="space-y-3 rounded-lg border border-border-subtle/60 bg-bg/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text">
                      {localizedName({ name_en: division.nameEn, name_cn: division.nameCn }, lang)}
                    </p>
                    <span
                      className={`text-[10px] font-medium uppercase ${
                        division.submissionStatus === "submitted" ? "text-success" : "text-warning"
                      }`}
                    >
                      {division.submissionStatus === "submitted"
                        ? reportText("submitted", language)
                        : reportText("draft", language)}
                    </span>
                  </div>
                  <DivisionRateBar
                    label={reportText("workCompletion", language)}
                    value={division.workCompletionRate}
                    color={areaColor(division.code)}
                    index={index}
                  />
                  {division.projectProgressRate != null ? (
                    <DivisionRateBar
                      label={reportText("projectProgress", language)}
                      value={division.projectProgressRate}
                      color={areaColor(division.code)}
                      index={index + 1}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-4 text-sm font-medium text-text">{reportText("dailyWork", language)}</h2>
              <div className="grid grid-cols-2 gap-3">
                <StatRow label={reportText("planned", language)} value={metrics.dailyWork.planned} />
                <StatRow
                  label={reportText("completedLabel", language)}
                  value={metrics.dailyWork.completed}
                />
                <StatRow label={reportText("inProgress", language)} value={metrics.dailyWork.inProgress} />
                <StatRow label={reportText("notStarted", language)} value={metrics.dailyWork.notStarted} />
              </div>
              <p className="mt-4 text-lg font-semibold text-accent">
                {metrics.dailyWork.completionRate}%
              </p>
              <p className="text-[11px] text-text-dim">{reportText("workCompletion", language)}</p>
            </section>

            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-4 text-sm font-medium text-text">{reportText("projectOverview", language)}</h2>
              {metrics.projects.activeCount === 0 ? (
                <p className="py-6 text-center text-sm text-text-muted">
                  {reportText("noActiveProjects", language)}
                </p>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatRow
                      label={reportText("activeProjects", language)}
                      value={metrics.projects.activeCount}
                    />
                    <StatRow label={reportText("onTrack", language)} value={metrics.projects.onTrack} />
                    <StatRow label={reportText("atRisk", language)} value={metrics.projects.atRisk} />
                    <StatRow label={reportText("delayed", language)} value={metrics.projects.delayed} />
                  </div>
                  <div className="space-y-2">
                    {metrics.projects.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle/60 bg-bg/20 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text">
                            {localizedField(item.nameEn, item.nameCn, lang)}
                          </p>
                          <p className="text-[10px] text-text-dim">{item.areaCode}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-text">{item.progressRate}%</p>
                          <p
                            className={`text-[10px] ${
                              item.status === "on_track"
                                ? "text-success"
                                : item.status === "at_risk"
                                  ? "text-warning"
                                  : "text-danger"
                            }`}
                          >
                            {item.status === "on_track"
                              ? reportText("onTrack", language)
                              : item.status === "at_risk"
                                ? reportText("atRisk", language)
                                : reportText("delayed", language)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-4 text-sm font-medium text-text">{reportText("safetySection", language)}</h2>
              <div className="space-y-3">
                <StatRow
                  label={reportText("status", language)}
                  value={
                    metrics.safety.submissionStatus === "submitted"
                      ? reportText("submitted", language)
                      : reportText("draft", language)
                  }
                />
                <StatRow
                  label={reportText("avgCompletion", language)}
                  value={`${metrics.safety.avgCompletionRate}%`}
                />
                <StatRow
                  label={reportText("openFindings", language)}
                  value={metrics.safety.openFindings}
                />
              </div>
            </section>

            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-4 text-sm font-medium text-text">
                {reportText("attentionRequired", language)}
              </h2>
              {metrics.attention.length === 0 ? (
                <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/5 p-4 text-center">
                  <p className="text-sm font-medium text-success">
                    {reportText("noAttentionRequired", language)}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {metrics.attention.map((item, index) => {
                    const borderClass =
                      item.severity === "critical"
                        ? "border-rose-400/30 bg-rose-500/5"
                        : item.severity === "warning"
                          ? "border-amber-400/30 bg-amber-500/5"
                          : "border-border-subtle bg-bg/20";

                    return (
                      <div
                        key={`${item.messageEn}-${index}`}
                        className={`rounded-lg border px-3 py-2.5 text-sm text-text ${borderClass}`}
                      >
                        {language === "cn" ? item.messageCn : item.messageEn}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-xl border border-border-subtle bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-medium text-text">
                  {reportText("recentLines", language)} — {weekLabel(metrics.weekNumber, language)}
                </h2>
                {metrics.recentLines.length > 0 ? (
                  <p className="mt-1 text-xs text-text-muted">
                    {reportText("recentLinesSummary", language)
                      .replace("{onTrack}", String(metrics.recentLineStats.onTrack))
                      .replace("{needs}", String(metrics.recentLineStats.needsAttention))}
                  </p>
                ) : null}
              </div>
              <Link
                href="/report/summary"
                className="shrink-0 text-xs font-medium text-accent transition hover:text-accent/80"
              >
                {reportText("viewAll", language)} →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-xs text-text-dim">
                    <th className="w-[22%] pb-2 pr-4 font-medium">{reportText("subItem", language)}</th>
                    <th className="pb-2 pr-4 font-medium">{reportText("target", language)}</th>
                    <th className="w-[20%] pb-2 text-right font-medium">{reportText("status", language)}</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentLines.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-text-muted">
                        {reportText("noLines", language)}
                      </td>
                    </tr>
                  ) : (
                    metrics.recentLines.map((row) => {
                      const needsAttention = recentLineNeedsAttention(row);
                      const rowClass = needsAttention
                        ? "border-b border-border-subtle/60 border-l-2 border-l-amber-400 bg-amber-500/5"
                        : "border-b border-border-subtle/60";

                      return (
                        <tr key={row.id} className={rowClass}>
                          <td
                            className={`py-2.5 pr-4 pl-3 align-top text-xs ${needsAttention ? "text-text" : "text-text-muted"}`}
                          >
                            {localizedField(row.subItemNameEn, row.subItemNameCn, lang) || "—"}
                          </td>
                          <td className={`max-w-md py-2.5 pr-4 align-top ${needsAttention ? "font-medium text-text" : "font-medium text-text/85"}`}>
                            <RecentTargetCell
                              text={localizedField(row.workTargetEn, row.workTargetCn, lang)}
                              language={language}
                            />
                          </td>
                          <td className="py-2.5 pr-1 text-right align-top">
                            <RecentLineStatusBadge line={row} language={language} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
