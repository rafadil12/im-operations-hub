"use client";

import { useEffect, useState } from "react";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { formatDateOnly } from "@/lib/dateRange";
import { localizedField, localizedName, useLang } from "@/lib/i18n";
import {
  divisionColor,
  trainingText,
  type TrainingLanguage,
  type TrainingOverviewMetrics,
} from "@/lib/training";
import {
  TrainingCategoryDonut,
  TrainingTopicsByDivisionChart,
  TrainingTopParticipantsChart,
  TrainingTrendChart,
} from "./TrainingCharts";

const dateCtrl =
  "cursor-pointer rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";

function getDefaultRange() {
  const now = new Date();
  return {
    start: formatDateOnly(new Date(now.getFullYear(), 0, 1)),
    end: formatDateOnly(now),
  };
}

const defaultRange = getDefaultRange();

function Kpi({
  title,
  value,
  subtitle,
  tone = "accent",
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone?: "accent" | "success" | "default";
}) {
  const valueClass =
    tone === "success" ? "text-success" : tone === "default" ? "text-text" : "text-accent";

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <p className="text-[10px] uppercase tracking-wide text-text-dim">{title}</p>
      <p className={`mt-3 text-2xl font-semibold ${valueClass}`}>{value}</p>
      {subtitle ? <p className="mt-1 text-[11px] text-text-muted">{subtitle}</p> : null}
    </div>
  );
}

export function TrainingOverview() {
  const { lang, t } = useLang();
  const language = lang as TrainingLanguage;
  const [range, setRange] = useState(defaultRange);
  const [draftRange, setDraftRange] = useState(defaultRange);
  const [metrics, setMetrics] = useState<TrainingOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({
      start: range.start,
      end: range.end,
    });

    apiGetAbs<{ success: boolean; data: TrainingOverviewMetrics; error?: string }>(
      `/api/training/overview?${qs.toString()}`,
      { signal: ac.signal }
    )
      .then((res) => {
        if (!res.success || !res.data) throw new Error(res.error ?? "Failed");
        setMetrics(res.data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(getApiErrorMessage(err) || trainingText("errorLoad", language));
        setMetrics(null);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [range, language]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">{trainingText("overviewTitle", language)}</h1>
          <p className="mt-1 text-sm text-text-muted">{trainingText("overviewDesc", language)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className={dateCtrl}
            value={draftRange.start}
            onChange={(e) => setDraftRange({ ...draftRange, start: e.target.value })}
          />
          <span className="text-xs text-text-dim">–</span>
          <input
            type="date"
            className={dateCtrl}
            value={draftRange.end}
            onChange={(e) => setDraftRange({ ...draftRange, end: e.target.value })}
          />
          <button
            type="button"
            onClick={() => setRange(draftRange)}
            className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            {t.common.apply}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
          {trainingText("loading", language)}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {metrics && !loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi title={trainingText("totalSessions", language)} value={String(metrics.totalSessions)} />
            <Kpi
              title={trainingText("totalParticipants", language)}
              value={String(metrics.totalParticipants)}
            />
            <Kpi
              title={trainingText("uniqueParticipants", language)}
              value={String(metrics.uniqueParticipants)}
              tone="success"
            />
            <Kpi
              title={trainingText("totalTopics", language)}
              value={String(metrics.totalTopics)}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <div className="mb-3">
                <h2 className="text-sm font-medium text-text">
                  {trainingText("sessionsTrend", language)}
                </h2>
                <p className="mt-1 text-xs text-text-dim">
                  {metrics.trendGranularity === "day"
                    ? trainingText("sessionsTrendDailyHint", language)
                    : trainingText("sessionsTrendMonthlyHint", language)}
                </p>
              </div>
              <TrainingTrendChart
                data={metrics.monthlyTrend}
                language={language}
                granularity={metrics.trendGranularity}
              />
            </section>

            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-3 text-sm font-medium text-text">
                {trainingText("byCategory", language)}
              </h2>
              <TrainingCategoryDonut data={metrics.byDivision} language={language} />
            </section>

            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-3 text-sm font-medium text-text">
                {trainingText("topParticipants", language)}
              </h2>
              {metrics.topParticipants.length ? (
                <TrainingTopParticipantsChart data={metrics.topParticipants} language={language} />
              ) : (
                <p className="py-10 text-center text-sm text-text-muted">
                  {trainingText("noSessions", language)}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-3 text-sm font-medium text-text">
                {trainingText("topicsByDivision", language)}
              </h2>
              <TrainingTopicsByDivisionChart data={metrics.byDivision} language={language} />
            </section>
          </div>

          <section className="rounded-xl border border-border-subtle bg-surface p-4">
            <h2 className="mb-3 text-sm font-medium text-text">
              {trainingText("recentSessions", language)}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-xs text-text-dim">
                    <th className="pb-2 pr-3 font-medium">{trainingText("date", language)}</th>
                    <th className="pb-2 pr-3 font-medium">{trainingText("topic", language)}</th>
                    <th className="pb-2 pr-3 font-medium">{trainingText("division", language)}</th>
                    <th className="pb-2 pr-3 font-medium">{trainingText("count", language)}</th>
                    <th className="pb-2 font-medium">{trainingText("attachment", language)}</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentSessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted">
                        {trainingText("noSessions", language)}
                      </td>
                    </tr>
                  ) : (
                    metrics.recentSessions.map((row) => (
                      <tr key={row.id} className="border-b border-border-subtle/60">
                        <td className="py-2.5 pr-3 text-text-muted">{row.sessionDate}</td>
                        <td className="py-2.5 pr-3 font-medium text-text">
                          {localizedField(row.topicEn, row.topicCn, lang)}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium text-white"
                            style={{ backgroundColor: divisionColor(row.divisionNameEn) }}
                          >
                            {localizedName(
                              { name_en: row.divisionNameEn, name_cn: row.divisionNameCn },
                              lang
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">{row.participantCount}</td>
                        <td className="py-2.5">
                          {row.attachment ? (
                            <a
                              href={row.attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent hover:underline"
                            >
                              {trainingText("viewFile", language)}
                            </a>
                          ) : (
                            <span className="text-text-dim">{trainingText("noFile", language)}</span>
                          )}
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
