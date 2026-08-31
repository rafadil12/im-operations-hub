"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { localizedField, localizedName, useLang } from "@/lib/i18n";
import {
  areaColor,
  reportText,
  type ReportLanguage,
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

export function ReportOverview() {
  const { lang } = useLang();
  const language = lang as ReportLanguage;
  const initialYear = new Date().getFullYear();
  const initialWeek = getWeekNumberForDate(new Date());

  const [year, setYear] = useState(initialYear);
  const [draftYear, setDraftYear] = useState(initialYear);
  const [weekNumber, setWeekNumber] = useState(initialWeek);
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

  const goWeek = (delta: number) => {
    setWeekNumber((current) => Math.min(53, Math.max(1, current + delta)));
  };

  const applyYear = () => {
    setYear(draftYear);
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
            <div className="min-w-[88px] rounded-md border border-border bg-surface px-3 py-1.5 text-center text-xs font-medium text-text">
              {weekLabel(weekNumber, language)}
            </div>
            <button
              type="button"
              onClick={() => goWeek(1)}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-muted hover:bg-surface-hover"
              aria-label={reportText("nextWeek", language)}
            >
              ›
            </button>
          </div>

          <input
            type="number"
            className="w-24 rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
            value={draftYear}
            onChange={(e) => setDraftYear(Number(e.target.value))}
          />
          <button
            type="button"
            onClick={applyYear}
            className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            {reportText("apply", language)}
          </button>
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
            <h2 className="mb-3 text-sm font-medium text-text">
              {reportText("recentLines", language)} — {weekLabel(metrics.weekNumber, language)}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-xs text-text-dim">
                    <th className="pb-2 pr-3 font-medium">{reportText("subItem", language)}</th>
                    <th className="pb-2 pr-3 font-medium">{reportText("target", language)}</th>
                    <th className="pb-2 pr-3 text-center font-medium">{reportText("rate", language)}</th>
                    <th className="pb-2 font-medium">{reportText("summary", language)}</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentLines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-text-muted">
                        {reportText("noLines", language)}
                      </td>
                    </tr>
                  ) : (
                    metrics.recentLines.map((row) => (
                      <tr key={row.id} className="border-b border-border-subtle/60">
                        <td className="py-2.5 pr-3 text-text-muted">
                          {localizedField(row.subItemNameEn, row.subItemNameCn, lang) || "—"}
                        </td>
                        <td className="max-w-xs py-2.5 pr-3 font-medium text-text">
                          {localizedField(row.workTargetEn, row.workTargetCn, lang)}
                        </td>
                        <td className="py-2.5 pr-3 text-center">
                          {row.weeklyCompletionRate != null
                            ? `${Math.round(row.weeklyCompletionRate * 100)}%`
                            : "—"}
                        </td>
                        <td className="max-w-md py-2.5 text-text-muted line-clamp-2">
                          {localizedField(row.summaryEn, row.summaryCn, lang)}
                        </td>
                      </tr>
                    ))
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
