"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/apiClient";
import { getOperationalWeek } from "@/lib/dateRange";
import { useLang } from "@/lib/i18n";
import { namedStatusCount, type AnalysisResult } from "@/lib/types";
import { AnalysisCharts } from "@/components/daily-operation/analysis/AnalysisCharts";

const week = getOperationalWeek();
const defaultRange = { start: week.start.slice(0, 10), end: week.end.slice(0, 10) };
function getCurrentMonthRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function getCurrentYearRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

type AnalysisResponse = { result: AnalysisResult };

const ctrl =
  "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";

export default function AnalysisPage() {
  const { t } = useLang();
  const [range, setRange] = useState(defaultRange);
  const [draft, setDraft] = useState(defaultRange);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<AnalysisResponse>(
        `/analysis?start=${start}&end=${end}`,
      );
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analysis.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data on mount / range change
    load(range.start, range.end);
  }, [load, range]);

  const kpis = result
    ? [
        { label: t.analysis.total, value: result.total, tone: "text-text" },
        {
          label: t.analysis.completed,
          value: namedStatusCount(result.byStatus, "Completed"),
          tone: "text-success",
        },
        {
          label: t.analysis.inProgress,
          value: namedStatusCount(result.byStatus, "In Progress"),
          tone: "text-accent",
        },
        {
          label: t.analysis.pending,
          value: namedStatusCount(result.byStatus, "Pending"),
          tone: "text-warning",
        },
        {
          label: t.analysis.avgDuration,
          value: result.avgDurationMinutes,
          tone: "text-text",
        },
      ]
    : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">{t.dailyOp.analysisTitle}</h1>
          <p className="text-sm text-text-muted">{t.dailyOp.analysisDesc}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(defaultRange);
              setRange(defaultRange);
            }}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
          >
            {t.analysis.thisWeek}
          </button>

          <button
            type="button"
            onClick={() => {
              const range = getCurrentMonthRange();
              setDraft(range);
              setRange(range);
            }}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
          >
            {t.analysis.thisMonth}
          </button>

          <button
            type="button"
            onClick={() => {
              const range = getCurrentYearRange();
              setDraft(range);
              setRange(range);
            }}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
          >
            {t.analysis.thisYear}
          </button>

          <input
            type="date"
            className={ctrl}
            value={draft.start}
            onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
          />

          <span className="text-xs text-text-dim">–</span>

          <input
            type="date"
            className={ctrl}
            value={draft.end}
            onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
          />

          <button
            type="button"
            onClick={() => setRange(draft)}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            {t.common.apply}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {loading || !result ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
          {t.common.loading}
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <p className="text-[10px] uppercase tracking-wide text-text-dim">
                  {kpi.label}
                </p>
                <p className={`mt-1 text-2xl font-semibold ${kpi.tone}`}>
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>
          <AnalysisCharts result={result} />
        </>
      )}
    </div>
  );
}
