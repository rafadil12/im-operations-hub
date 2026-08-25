"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/apiClient";
import { getOperationalWeek } from "@/lib/dateRange";
import { useLang } from "@/lib/i18n";
import { type ItsmAnalysisResult } from "@/lib/types";
import { ITSMAnalysisCharts } from "@/components/itsm/analysis/ITSMAnalysisCharts";

const week = getOperationalWeek();
const defaultRange = { start: week.start.slice(0, 10), end: week.end.slice(0, 10) };
function getCurrentMonthRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: start.toLocaleDateString("en-CA"),
    end: end.toLocaleDateString("en-CA"),
  };
}

function getCurrentYearRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);

  return {
    start: start.toLocaleDateString("en-CA"),
    end: end.toLocaleDateString("en-CA"),
  };
}

type AnalysisResponse = { result: ItsmAnalysisResult };

const ctrl =
  "cursor-pointer rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";

export default function AnalysisPage() {
  const { t } = useLang();
  const [activeFilter, setActiveFilter] = useState<"week" | "month" | "year" | null>("week");
  const [group, setGroup] = useState("All");
  const [range, setRange] = useState(defaultRange);
  const [draft, setDraft] = useState(defaultRange);
  const [result, setResult] = useState<ItsmAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (start: string, end: string) => {
      setLoading(true);
      setError(null);

      try {
        const data = await apiGet<AnalysisResponse>(
          `/analysis?start=${start}&end=${end}&group=${encodeURIComponent(group)}`,
          "itsm"
        );

        setResult(data.result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load analysis.");
      } finally {
        setLoading(false);
      }
    },
    [group]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data on mount / range change
    load(range.start, range.end);
  }, [load, range]);

  const kpis = result
    ? [
        {
          label: t.itsmAnalysis.total,
          value: result.total,
          tone: "text-text",
        },
        {
          label: t.itsmAnalysis.open,
          value: result.openTickets,
          tone: "text-warning",
        },
        {
          label: t.itsmAnalysis.closed,
          value: result.closedTickets,
          tone: "text-success",
        },
        {
          label: t.itsmAnalysis.activeUsers,
          value: result.activeUsers,
          tone: "text-accent",
        },
        {
          label: t.itsmAnalysis.avgResolution,
          value: result.avgTicketsPerDay,
          tone: "text-text",
        },
      ]
    : [];

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-text">{t.itsm.analysisTitle}</h1>
          <p className="text-sm text-text-muted">{t.itsm.analysisDesc}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveFilter("week");
              setDraft(defaultRange);
              setRange(defaultRange);
            }}
            className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === "week"
                ? "border-accent bg-accent text-white"
                : "border-border text-text-muted hover:bg-surface-hover hover:text-text"
            }`}
          >
            {t.itsmAnalysis.thisWeek}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFilter("month");
              const range = getCurrentMonthRange();
              setDraft(range);
              setRange(range);
            }}
            className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === "month"
                ? "border-accent bg-accent text-white"
                : "border-border text-text-muted hover:bg-surface-hover hover:text-text"
            }`}
          >
            {t.itsmAnalysis.thisMonth}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFilter("year");
              const range = getCurrentYearRange();
              setDraft(range);
              setRange(range);
            }}
            className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === "year"
                ? "border-accent bg-accent text-white"
                : "border-border text-text-muted hover:bg-surface-hover hover:text-text"
            }`}
          >
            {t.itsmAnalysis.thisYear}
          </button>

          <select className={ctrl} value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="All">{t.itsmAnalysis.allGroup}</option>

            <option value="Indonesia-L1-MES-Group">Indonesia-L1-MES-Group</option>

            <option value="Indonesia-L1-Desktop-Group">Indonesia-L1-Desktop-Group</option>

            <option value="Indonesia-L1-Data Center-Group">Indonesia-L1-Data Center-Group</option>

            <option value="Indonesia-L1-Network-Group">Indonesia-L1-Network-Group</option>

            <option value="Indonesia-L1-SAP-Group">Indonesia-L1-SAP-Group</option>

            <option value="Indonesia-L1-Application-Group">Indonesia-L1-Application-Group</option>
          </select>

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
            className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
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
              <div key={kpi.label} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-[10px] uppercase tracking-wide text-text-dim">{kpi.label}</p>
                <p className={`mt-1 text-2xl font-semibold ${kpi.tone}`}>{kpi.value}</p>
              </div>
            ))}
          </div>
          <ITSMAnalysisCharts result={result} activeFilter={activeFilter} />
        </>
      )}
    </div>
  );
}
