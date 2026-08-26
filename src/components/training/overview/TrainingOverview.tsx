"use client";

import { useEffect, useState } from "react";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";
import {
  CATEGORY_COLORS,
  categoryLabel,
  trainingText,
  type TrainingLanguage,
  type TrainingOverviewMetrics,
} from "@/lib/training";
import {
  TrainingAttachmentChart,
  TrainingCategoryDonut,
  TrainingTopParticipantsChart,
  TrainingTrendChart,
} from "./TrainingCharts";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function Kpi({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <p className="text-[10px] uppercase tracking-wide text-text-dim">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-text">{value}</p>
      {subtitle ? <p className="mt-1 text-[11px] text-text-muted">{subtitle}</p> : null}
    </div>
  );
}

export function TrainingOverview() {
  const { lang } = useLang();
  const language = lang as TrainingLanguage;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | "all">(now.getMonth() + 1);
  const [metrics, setMetrics] = useState<TrainingOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({ year: String(year) });
    if (month !== "all") qs.set("month", String(month));

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
  }, [year, month, language]);

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">{trainingText("overviewTitle", language)}</h1>
          <p className="mt-1 text-sm text-text-muted">{trainingText("overviewDesc", language)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="text-xs text-text-muted">
            {trainingText("year", language)}
            <select
              className="ml-2 rounded-md border border-border-subtle bg-bg px-2 py-1.5 text-sm text-text"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-text-muted">
            {trainingText("month", language)}
            <select
              className="ml-2 rounded-md border border-border-subtle bg-bg px-2 py-1.5 text-sm text-text"
              value={month}
              onChange={(e) => {
                const value = e.target.value;
                setMonth(value === "all" ? "all" : Number(value));
              }}
            >
              <option value="all">All</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
          </label>
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
            />
            <Kpi
              title={trainingText("attachmentRate", language)}
              value={`${metrics.attachmentRate}%`}
              subtitle={`${metrics.sessionsWithAttachment}/${metrics.totalSessions}`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-3 text-sm font-medium text-text">
                {trainingText("sessionsTrend", language)}
              </h2>
              <TrainingTrendChart data={metrics.monthlyTrend} language={language} />
            </section>

            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-3 text-sm font-medium text-text">
                {trainingText("byCategory", language)}
              </h2>
              <TrainingCategoryDonut data={metrics.byCategory} language={language} />
            </section>

            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-3 text-sm font-medium text-text">
                {trainingText("topParticipants", language)}
              </h2>
              {metrics.topParticipants.length ? (
                <TrainingTopParticipantsChart data={metrics.topParticipants} />
              ) : (
                <p className="py-10 text-center text-sm text-text-muted">
                  {trainingText("noSessions", language)}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-3 text-sm font-medium text-text">
                {trainingText("attachmentByCategory", language)}
              </h2>
              <TrainingAttachmentChart data={metrics.attachmentByCategory} language={language} />
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
                    <th className="pb-2 pr-3 font-medium">{trainingText("category", language)}</th>
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
                        <td className="py-2.5 pr-3 font-medium text-text">{row.topic}</td>
                        <td className="py-2.5 pr-3">
                          <span
                            className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium text-white"
                            style={{ backgroundColor: CATEGORY_COLORS[row.category] }}
                          >
                            {categoryLabel(row.category, language)}
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
