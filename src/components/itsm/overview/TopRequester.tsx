"use client";

import { useEffect, useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { RequesterRanking } from "./types";

type Props = {
  rows: RequesterRanking[];
};

export default function TopRequester({ rows }: Props) {
  const { t } = useLang();
  const [startIndex, setStartIndex] = useState(0);
  const [animate, setAnimate] = useState(false);

  const sortedRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          (Number(b.totalTickets) || 0) - (Number(a.totalTickets) || 0),
      ),
    [rows],
  );

  useEffect(() => {
    if (sortedRows.length <= 5) return;

    const timer = setInterval(() => {
      setStartIndex((prev) => (prev + 1) % sortedRows.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [sortedRows.length]);

  const visibleRows = useMemo(() => {
    if (sortedRows.length <= 5) return sortedRows;

    return Array.from(
      { length: 5 },
      (_, index) => sortedRows[(startIndex + index) % sortedRows.length],
    );
  }, [sortedRows, startIndex]);

  const maxTickets = Math.max(
    1,
    ...visibleRows.map((item) => Number(item.totalTickets) || 0),
  );

  const totalVisibleTickets = visibleRows.reduce(
    (sum, item) => sum + (Number(item.totalTickets) || 0),
    0,
  );

  const topTickets = Number(visibleRows[0]?.totalTickets) || 0;
  const secondTickets = Number(visibleRows[1]?.totalTickets) || 0;

  const averageTickets =
    visibleRows.length > 0
      ? totalVisibleTickets / visibleRows.length
      : 0;

  const sortedVisibleTickets = visibleRows
    .map((item) => Number(item.totalTickets) || 0)
    .sort((a, b) => a - b);

  const medianTickets =
    sortedVisibleTickets.length > 0
      ? sortedVisibleTickets.length % 2 === 0
        ? (sortedVisibleTickets[sortedVisibleTickets.length / 2 - 1] +
            sortedVisibleTickets[sortedVisibleTickets.length / 2]) /
          2
        : sortedVisibleTickets[
            Math.floor(sortedVisibleTickets.length / 2)
          ]
      : 0;

  const topShare =
    totalVisibleTickets > 0
      ? (topTickets / totalVisibleTickets) * 100
      : 0;

  const leadTickets = Math.max(0, topTickets - secondTickets);

  const topVsAverage =
    averageTickets > 0
      ? ((topTickets - averageTickets) / averageTickets) * 100
      : 0;

  useEffect(() => {
    setAnimate(false);
    const frame = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, [startIndex, rows]);

  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-accent/30" />

      {/* HEADER */}
      <div className="border-b border-border-subtle px-5 py-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Trophy size={15} className="text-accent" />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
                {t.itsm.topRequester}
              </span>
            </div>

            <p className="mt-1 text-[11px] text-text-muted">
              {t.itsm.highestSubmittedTickets}
            </p>
          </div>

          <div className="flex shrink-0 items-end gap-4 text-right">
            <div>
              <p className="font-mono text-lg font-extrabold text-text">
                {totalVisibleTickets.toLocaleString()}
              </p>
              <p className="text-[9px] text-text-dim">
                {t.itsmAnalysis.tickets}
              </p>
            </div>

            <div className="border-l border-border-subtle pl-4">
              <p className="font-mono text-sm font-bold text-text">
                {averageTickets.toFixed(1)}
              </p>
              <p className="text-[9px] text-text-dim">
                {t.itsmAnalysis.average}
              </p>
            </div>
          </div>
        </div>

        {/* QUICK ANALYSIS */}
        {visibleRows.length > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border-subtle bg-bg/35 px-3 py-2.5">
              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-text-dim">
                {t.itsmAnalysis.topShareLabel}
              </p>

              <div className="mt-1 flex items-end justify-between gap-2">
                <p className="font-mono text-sm font-extrabold text-text">
                  {topShare.toFixed(1)}%
                </p>
                <span className="text-[8px] text-text-dim">
                  {t.itsmAnalysis.ofShown}
                </span>
              </div>

              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-bg">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                  style={{
                    width: animate ? `${Math.min(topShare, 100)}%` : "0%",
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg/35 px-3 py-2.5">
              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-text-dim">
                {t.itsmAnalysis.lead}
              </p>

              <div className="mt-1 flex items-end justify-between gap-2">
                <p className="font-mono text-sm font-extrabold text-text">
                  +{leadTickets.toLocaleString()}
                </p>

                <span className="text-[8px] text-text-dim">
                  {t.itsmAnalysis.vsSecond}
                </span>
              </div>

              <p className="mt-1.5 text-[9px] text-text-muted">
                {t.itsmAnalysis.vsAverage.replace(
                  "{n}",
                  topVsAverage.toFixed(0),
                )}
              </p>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg/35 px-3 py-2.5">
              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-text-dim">
                {t.itsmAnalysis.median}
              </p>

              <div className="mt-1 flex items-end justify-between gap-2">
                <p className="font-mono text-sm font-extrabold text-text">
                  {medianTickets.toFixed(0)}
                </p>

                <span className="text-[8px] text-text-dim">
                  {t.itsmAnalysis.tickets}
                </span>
              </div>

              <p className="mt-1.5 text-[9px] text-text-muted">
                {topTickets > medianTickets
                  ? t.itsmAnalysis.topAboveMedian
                  : t.itsmAnalysis.balancedWorkload}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* RANKING */}
      <div className="divide-y divide-border-subtle">
        {visibleRows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-text-muted">
            {t.itsm.noRequesterData}
          </div>
        ) : (
          visibleRows.map((item, index) => {
            const tickets = Number(item.totalTickets) || 0;
            const percentage = Math.min(
              100,
              (tickets / maxTickets) * 100,
            );

            const isTop = index === 0;

            return (
              <div
                key={`${item.requester}-${startIndex}-${index}`}
                className={[
                  "px-5 py-3.5 transition-colors hover:bg-surface-hover",
                  isTop ? "bg-accent/[0.025]" : "",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "w-9 shrink-0 text-center font-mono text-[10px] font-bold",
                      isTop ? "text-accent" : "text-text-dim",
                    ].join(" ")}
                  >
                    #{index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <p
                        className={[
                          "truncate text-xs",
                          isTop
                            ? "font-bold text-text"
                            : "font-medium text-text",
                        ].join(" ")}
                        title={item.requester}
                      >
                        {item.requester}
                      </p>

                      <div className="shrink-0 text-right">
                        <span
                          className={[
                            "block font-mono",
                            isTop
                              ? "text-sm font-extrabold text-text"
                              : "text-xs font-bold text-text",
                          ].join(" ")}
                        >
                          {tickets.toLocaleString()}
                        </span>

                        {isTop ? (
                          <span className="text-[8px] font-medium text-accent">
                            {t.itsmAnalysis.highest}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                      <div
                        className={[
                          "h-full rounded-full transition-[width] duration-700 ease-out",
                          isTop ? "bg-accent" : "bg-accent/45",
                        ].join(" ")}
                        style={{
                          width: animate ? `${percentage}%` : "0%",
                        }}
                      />
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[9px]">
                      <span className="text-text-dim">
                        {t.itsmAnalysis.percentOfShown.replace(
                          "{n}",
                          totalVisibleTickets > 0
                            ? ((tickets / totalVisibleTickets) * 100).toFixed(1)
                            : "0.0",
                        )}
                      </span>

                      {isTop ? (
                        <span className="font-mono font-semibold text-text-muted">
                          {t.itsmAnalysis.highest}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {sortedRows.length > 5 ? (
        <div className="border-t border-border-subtle px-5 py-2.5 text-[9px] text-text-dim">
          {startIndex + 1}–{Math.min(startIndex + 5, sortedRows.length)} /{" "}
          {sortedRows.length}
        </div>
      ) : null}
    </div>
  );
}
