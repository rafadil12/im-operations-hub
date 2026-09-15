"use client";

import { useEffect, useMemo, useState } from "react";

import { useLang } from "@/lib/i18n";
import { ChartCard } from "./ChartCard";

type Technician = {
  name: string;
  currentCount: number;
  previousCount: number;
};

export function TopTechnicianCard({
  title,
  technicians,
  activeFilter,
}: {
  title: string;
  technicians: Technician[];
  activeFilter: "week" | "month" | "year" | null;
}) {
  const { t } = useLang();

  const data = useMemo(() => {
    return [...technicians]
      .filter((item) => item && item.name)
      .map((item) => {
        const current = Math.max(0, Number(item.currentCount ?? 0));
        const previous = Math.max(0, Number(item.previousCount ?? 0));
        const difference = current - previous;

        const percentage =
          previous > 0
            ? (difference / previous) * 100
            : current > 0
              ? 100
              : 0;

        return {
          name: item.name,
          current,
          previous,
          difference,
          percentage,
        };
      })
      .sort((a, b) => {
        if (b.current !== a.current) {
          return b.current - a.current;
        }

        return b.previous - a.previous;
      });
  }, [technicians]);
  const [showAll, setShowAll] = useState(false);
  const [animateBars, setAnimateBars] = useState(false);

  const visibleData = showAll ? data : data.slice(0, 2);

  useEffect(() => {
    setAnimateBars(false);

    const frame = requestAnimationFrame(() => {
      setAnimateBars(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [data]);

  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => [item.current, item.previous])
  );

  const periodLabel = useMemo(() => {
    switch (activeFilter) {
      case "week":
        return {
          current: t.itsmAnalysis.thisWeek,
          previous: t.itsmAnalysis.lastWeek,
        };

      case "month":
        return {
          current: t.itsmAnalysis.thisMonth,
          previous: t.itsmAnalysis.lastMonth,
        };

      case "year":
        return {
          current: t.itsmAnalysis.thisYear,
          previous: t.itsmAnalysis.lastYear,
        };

      default:
        return {
          current: t.itsmAnalysis.currentPeriod,
          previous: t.itsmAnalysis.previousPeriod,
        };
    }
  }, [activeFilter, t]);

  return (
    <ChartCard
      title={title}
      onClose={() => setShowAll(false)}
    >
      <div className="w-full">
        {data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center">
            <div className="text-center">
              <div className="mb-3 text-3xl opacity-60">👨‍💻</div>

              <p className="text-sm font-semibold text-text">
                {t.itsmAnalysis.technicianRanking}
              </p>

              <p className="mt-1 text-xs text-text-muted">
                {t.itsmAnalysis.noData}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* HEADER */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[13px] font-bold text-text">
                  {t.itsmAnalysis.technicianRanking}
                </p>

                <p className="mt-1 text-[11px] text-text-muted">
                  {t.itsmAnalysis.technicianPeriodComparison}
                </p>
              </div>

              <div className="flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
                  <span className="text-text-muted">
                    {periodLabel.current}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-300 dark:bg-slate-600" />
                  <span className="text-text-muted">
                    {periodLabel.previous}
                  </span>
                </div>
              </div>
            </div>

            {/* SUMMARY */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-wide text-text-muted">
                  {periodLabel.current}
                </p>

                <p className="mt-1 font-mono text-lg font-bold text-text">
                  {data.reduce(
                    (sum, item) => sum + item.current,
                    0
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-wide text-text-muted">
                  {periodLabel.previous}
                </p>

                <p className="mt-1 font-mono text-lg font-bold text-text">
                  {data.reduce(
                    (sum, item) => sum + item.previous,
                    0
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-wide text-text-muted">
                  {t.itsmAnalysis.change}
                </p>

                {(() => {
                  const currentTotal = data.reduce(
                    (sum, item) => sum + item.current,
                    0
                  );

                  const previousTotal = data.reduce(
                    (sum, item) => sum + item.previous,
                    0
                  );

                  const diff = currentTotal - previousTotal;

                  const percent =
                    previousTotal > 0
                      ? (diff / previousTotal) * 100
                      : currentTotal > 0
                        ? 100
                        : 0;

                  return (
                    <p
                      className="mt-1 font-mono text-lg font-bold"
                      style={{
                        color:
                          diff > 0
                            ? "#10B981"
                            : diff < 0
                              ? "#EF4444"
                              : undefined,
                      }}
                    >
                      {diff > 0 ? "+" : ""}
                      {diff}{" "}
                      <span className="text-[10px]">
                        ({percent.toFixed(1)}%)
                      </span>
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* TECHNICIAN ROWS */}
            <div className="space-y-3">
              {visibleData.map((item, index) => {
                const currentWidth =
                  (item.current / maxValue) * 100;

                const previousWidth =
                  (item.previous / maxValue) * 100;

                const isIncrease = item.difference > 0;
                const isDecrease = item.difference < 0;

                return (
                  <div
                    key={`${item.name}-${index}`}
                    className="rounded-xl border border-border-subtle bg-surface/40 px-3 py-3"
                  >
                    {/* NAME + CHANGE */}
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-text">
                          {index + 1}. {item.name}
                        </p>
                      </div>

                      <div
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background:
                            isIncrease
                              ? "rgba(16,185,129,.10)"
                              : isDecrease
                                ? "rgba(239,68,68,.10)"
                                : "rgba(148,163,184,.10)",
                          color:
                            isIncrease
                              ? "#059669"
                              : isDecrease
                                ? "#DC2626"
                                : "#64748B",
                        }}
                      >
                        {isIncrease
                          ? "↑"
                          : isDecrease
                            ? "↓"
                            : "→"}{" "}
                        {Math.abs(item.percentage).toFixed(1)}%
                      </div>
                    </div>

                    {/* CURRENT */}
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="w-[72px] shrink-0 text-[9px] font-medium text-text-muted">
                        {periodLabel.current}
                      </span>

                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{
                            width: animateBars ? `${currentWidth}%` : "0%",
                            transition: "width 700ms ease-out",
                          }}
                        />
                      </div>

                      <span className="w-8 text-right font-mono text-[10px] font-bold text-text">
                        {item.current}
                      </span>
                    </div>

                    {/* PREVIOUS */}
                    <div className="flex items-center gap-2">
                      <span className="w-[72px] shrink-0 text-[9px] font-medium text-text-muted">
                        {periodLabel.previous}
                      </span>

                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                        <div
                          className="h-full rounded-full bg-slate-300 dark:bg-slate-600"
                          style={{
                            width: animateBars ? `${previousWidth}%` : "0%",
                            transition: "width 700ms ease-out",
                          }}
                        />
                      </div>

                      <span className="w-8 text-right font-mono text-[10px] font-semibold text-text-muted">
                        {item.previous}
                      </span>
                    </div>

                    {/* DIFFERENCE */}
                    <div className="mt-2 flex justify-end">
                      <span
                        className="font-mono text-[9px] font-semibold"
                        style={{
                          color:
                            isIncrease
                              ? "#059669"
                              : isDecrease
                                ? "#DC2626"
                                : "#64748B",
                        }}
                      >
                        {t.itsmAnalysis.difference}:{" "}
                        {item.difference > 0 ? "+" : ""}
                        {item.difference}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

           {data.length > 2 && !showAll && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="mt-3 ml-auto flex items-center gap-1 text-[11px] font-semibold text-accent hover:opacity-80 transition-opacity"
              >
                {t.itsmAnalysis.viewAll}
                <span className="text-sm leading-none">→</span>
              </button>
            )}
          </div>
        )}
      </div>
    </ChartCard>
  );
}