"use client";

import { useEffect, useState } from "react";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { localizedField, localizedName, useLang } from "@/lib/i18n";
import { areaColor, reportText, type ReportLanguage, type ReportOverviewMetrics } from "@/lib/report";
import { VerticalBarChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { ProgressRingItem } from "@/components/overview/ModuleCardShared";

function Kpi({
  title,
  value,
  tone = "accent",
}: {
  title: string;
  value: string;
  tone?: "accent" | "success" | "warning" | "default";
}) {
  const valueClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "default"
          ? "text-text"
          : "text-accent";

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <p className="text-[10px] uppercase tracking-wide text-text-dim">{title}</p>
      <p className={`mt-3 text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

export function ReportOverview() {
  const { lang } = useLang();
  const language = lang as ReportLanguage;
  const [year, setYear] = useState(new Date().getFullYear());
  const [draftYear, setDraftYear] = useState(new Date().getFullYear());
  const [metrics, setMetrics] = useState<ReportOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    apiGetAbs<{ success: boolean; data: ReportOverviewMetrics; error?: string }>(
      `/api/report/overview?year=${year}`,
      { signal: ac.signal }
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
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [year, language]);

  const maxTrend = Math.max(...(metrics?.weeklyTrend.map((t) => t.avgRate) ?? [1]), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">{reportText("overviewTitle", language)}</h1>
          <p className="mt-1 text-sm text-text-muted">{reportText("overviewDesc", language)}</p>
          <p className="mt-1 text-xs text-text-dim">{reportText("weekRange", language)}</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            className="w-24 rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
            value={draftYear}
            onChange={(e) => setDraftYear(Number(e.target.value))}
          />
          <button
            type="button"
            onClick={() => setYear(draftYear)}
            className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Apply
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi title={reportText("totalLines", language)} value={String(metrics.totalLines)} />
            <Kpi
              title={reportText("avgCompletion", language)}
              value={`${metrics.avgCompletionRate}%`}
            />
            <Kpi
              title={reportText("submittedAreas", language)}
              value={String(metrics.submittedCount)}
              tone="success"
            />
            <Kpi
              title={reportText("draftAreas", language)}
              value={String(metrics.draftCount)}
              tone="warning"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-3 text-sm font-medium text-text">
                {reportText("weeklyTrend", language)}
              </h2>
              <VerticalBarChartPlaceholder
                items={metrics.weeklyTrend.map((row) => ({
                  label: row.label,
                  value: row.avgRate,
                  max: maxTrend,
                  color: "#eab308",
                }))}
              />
            </section>

            <section className="rounded-xl border border-border-subtle bg-surface p-4">
              <h2 className="mb-3 text-sm font-medium text-text">{reportText("byArea", language)}</h2>
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
            </section>
          </div>

          <section className="rounded-xl border border-border-subtle bg-surface p-4">
            <h2 className="mb-3 text-sm font-medium text-text">
              {reportText("recentLines", language)}
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
