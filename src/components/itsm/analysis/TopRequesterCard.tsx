"use client";

import { useState } from "react";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
} from "recharts";

import { useLang } from "@/lib/i18n";

import { ChartCard } from "./ChartCard";

type RequesterRow = {
  label: string;
  count: number;
  percentage: number;
};

type DonutRow = RequesterRow & {
  color: string;
};

const COLORS = [
  "#3B82F6",
  "#0CAE78",
  "#E8590C",
  "#7048E8",
  "#0C8599",
  "#E64980",
  "#F59F00",
  "#66A80F",
];

export function TopRequesterCard({
  title,
  requesterBar,
  requesterBarCompact: _requesterBarCompact,
  theme,
}: {
  title: string;
  requesterBar: { label: string; count: number }[];
  requesterBarCompact: { label: string; count: number }[];
  theme: string;
}) {
  const { lang, t } = useLang();

  const isDark = theme === "dark";

  const textColor = isDark ? "#F8FAFC" : "#141B33";
  const mutedColor = isDark ? "#94A3B8" : "#5B6478";
  const tooltipBackground = isDark ? "#1E293B" : "rgba(255,255,255,0.98)";
  const tooltipBorder = isDark ? "#334155" : "rgba(20,27,51,0.08)";
  const trackColor = isDark ? "#263449" : "#E8EDF4";

  const legendTickets = t.itsmAnalysis.tickets;

  // Expanded view: 30 requesters per page, split into 3 columns.
  // Each column contains 10 requesters.
  const REQUESTERS_PER_PAGE = 30;
  const [requesterPage, setRequesterPage] = useState(1);

  const buildData = (
    source: { label: string; count: number }[]
  ): RequesterRow[] => {
    const sorted = [...source]
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const total = sorted.reduce((sum, item) => sum + item.count, 0);

    return sorted.map((item) => ({
      label: item.label,
      count: item.count,
      percentage: total > 0 ? (item.count / total) * 100 : 0,
    }));
  };

  const expandedData = buildData(requesterBar);

  // Compact view: show Top 10 requesters + Others.
  // The expanded view still contains every requester.
  const allRequesterData = buildData(requesterBar);
  const topRequesterCount = 10;
  const topTen = allRequesterData.slice(0, topRequesterCount);
  const others = allRequesterData.slice(topRequesterCount);

  const othersCount = others.reduce((sum, item) => sum + item.count, 0);
  const allCount = allRequesterData.reduce((sum, item) => sum + item.count, 0);

  const compactData: RequesterRow[] = [
    ...topTen,
    ...(othersCount > 0
      ? [
          {
            label: "Others",
            count: othersCount,
            percentage: allCount > 0 ? (othersCount / allCount) * 100 : 0,
          },
        ]
      : []),
  ];

  const renderChart = (data: RequesterRow[], compact = false) => {
    if (data.length === 0) {
      return (
        <div className="flex h-[340px] items-center justify-center">
          <div className="text-center">
            <p
              className="text-sm font-semibold"
              style={{ color: textColor }}
            >
              {title}
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: mutedColor }}
            >
              {legendTickets}
            </p>
          </div>
        </div>
      );
    }

    const total = data.reduce((sum, item) => sum + item.count, 0);
    const maxCount = data[0]?.count ?? 0;
    const top = data[0];

    const donutData: DonutRow[] = data.map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length],
    }));

    const totalPages = Math.max(
      1,
      Math.ceil(donutData.length / REQUESTERS_PER_PAGE)
    );

    const safePage = Math.min(Math.max(requesterPage, 1), totalPages);

    const visibleRows = compact
      ? donutData.slice(0, 7)
      : donutData.slice(
          (safePage - 1) * REQUESTERS_PER_PAGE,
          safePage * REQUESTERS_PER_PAGE
        );

    return (
      <div className="w-full">
        <div
          className={
            compact
              ? "grid min-h-[320px] grid-cols-[40%_60%] items-center gap-2"
              : "grid min-h-[410px] grid-cols-[42%_58%] items-center gap-3"
          }
        >
          {/* Donut */}
          <div className="relative flex items-center justify-center">
            <div
              className={compact ? "h-[235px] w-[235px]" : "h-[315px] w-[315px]"}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={compact ? "55%" : "57%"}
                    outerRadius={compact ? "78%" : "80%"}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={2.5}
                    stroke={isDark ? "#0F172A" : "#FFFFFF"}
                    strokeWidth={4}
                    animationDuration={700}
                    activeShape={(props: any) => (
                      <Sector {...props} outerRadius={(props.outerRadius ?? 0) + 4} />
                    )}
                  >
                    {donutData.map((item) => (
                      <Cell key={item.label} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;

                      const row = payload[0].payload as DonutRow;

                      return (
                        <div
                          style={{
                            minWidth: 150,
                            background: tooltipBackground,
                            border: `1px solid ${tooltipBorder}`,
                            borderRadius: 10,
                            padding: "9px 12px",
                            boxShadow: "0 10px 28px rgba(20,27,51,.12)",
                          }}
                        >
                          <div
                            style={{
                              color: textColor,
                              fontSize: 11,
                              fontWeight: 700,
                              marginBottom: 5,
                            }}
                          >
                            {row.label}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 18,
                              color: mutedColor,
                              fontSize: 10,
                            }}
                          >
                            <span>{legendTickets}</span>
                            <strong style={{ color: textColor }}>
                              {row.count}
                            </strong>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 18,
                              color: row.color,
                              fontSize: 10,
                              marginTop: 2,
                            }}
                          >
                            <span>{t.itsmAnalysis.share}</span>
                            <strong>{row.percentage.toFixed(1)}%</strong>
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div
                  className={compact ? "text-[34px] font-bold leading-none" : "text-[42px] font-bold leading-none"}
                  style={{
                    color: textColor,
                    fontFamily: "JetBrains Mono, ui-monospace, monospace",
                    letterSpacing: "-0.04em",
                  }}
                >
                  {total}
                </div>
                <div
                  className="mt-2 text-[11px] font-medium"
                  style={{ color: mutedColor }}
                >
                  {legendTickets}
                </div>
                <div
                  className="mt-1 text-[10px] font-semibold"
                  style={{ color: mutedColor }}
                >
                  {t.itsmAnalysis.topShare.replace(
                    "{n}",
                    top.percentage.toFixed(1),
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ranking */}
          <div className="pr-2">
            <div className="mb-1">
              <div
                className={compact ? "text-[12px] font-bold" : "text-[14px] font-bold"}
                style={{ color: textColor }}
              >
              </div>
              <div
                className="mt-1 text-[12px] font-semibold"
                style={{ color: textColor }}
              >
                {t.itsmAnalysis.rankedByTicketVolume}
              </div>
            </div>

            {compact ? (
              <div className="mt-4 space-y-3">
                {visibleRows.map((item, index) => {
                  const width = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  const color = item.color;

                  return (
                    <div key={item.label} className="group">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 shrink-0 text-[10px] font-semibold"
                          style={{ color: isDark ? "#64748B" : "#94A3B8" }}
                        >
                          {index + 1}
                        </span>

                        <span
                          className="min-w-0 flex-1 truncate text-[12px] font-medium"
                          style={{ color: textColor }}
                          title={item.label}
                        >
                          {item.label}
                        </span>

                        <span
                          className="font-mono text-[12px] font-bold"
                          style={{ color: textColor }}
                        >
                          {item.count}
                        </span>

                        <span
                          className="w-11 text-right text-[10px] font-medium"
                          style={{ color: mutedColor }}
                        >
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>

                      <div
                        className="ml-6 mt-2 h-2 overflow-hidden rounded-full"
                        style={{ background: trackColor }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${width}%`,
                            background: color,
                            boxShadow: `0 2px 8px ${color}35`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                {donutData.length > visibleRows.length ? (
                  <div
                    className="mt-1 text-right text-[10px] font-medium"
                    style={{ color: mutedColor }}
                  >
                    {t.itsmAnalysis.more.replace(
                      "{n}",
                      String(donutData.length - visibleRows.length)
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-5">
                {(() => {
                  const pageStart = (safePage - 1) * REQUESTERS_PER_PAGE;
                  const pageRows = donutData.slice(
                    pageStart,
                    pageStart + REQUESTERS_PER_PAGE
                  );

                  // Split the current page as evenly as possible into 3 columns.
                  // Examples:
                  // 15 rows -> 5 / 5 / 5
                  // 16 rows -> 6 / 5 / 5
                  // 17 rows -> 6 / 6 / 5
                  const baseSize = Math.floor(pageRows.length / 3);
                  const remainder = pageRows.length % 3;

                  const columns = [0, 1, 2].map((columnIndex) => {
                    const extra = columnIndex < remainder ? 1 : 0;
                    const startIndex =
                      columnIndex * baseSize +
                      Math.min(columnIndex, remainder);

                    return pageRows.slice(
                      startIndex,
                      startIndex + baseSize + extra
                    );
                  });

                  return (
                    <div className="grid grid-cols-3 gap-5">
                      {columns.map((columnRows, columnIndex) => {
                        const columnStart =
                          pageStart +
                          columnIndex * baseSize +
                          Math.min(columnIndex, remainder);

                        return (
                          <div
                            key={columnIndex}
                            className="min-w-0 space-y-4"
                          >
                            {columnRows.map((item, localIndex) => {
                              const globalIndex = columnStart + localIndex;
                              const width =
                                maxCount > 0
                                  ? (item.count / maxCount) * 100
                                  : 0;
                              const color = item.color;

                              return (
                                <div
                                  key={item.label}
                                  className="group min-w-0"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-5 shrink-0 text-[10px] font-semibold"
                                      style={{
                                        color: isDark
                                          ? "#64748B"
                                          : "#94A3B8",
                                      }}
                                    >
                                      {globalIndex + 1}
                                    </span>

                                    <span
                                      className="min-w-0 flex-1 truncate text-[11px] font-medium"
                                      style={{ color: textColor }}
                                      title={item.label}
                                    >
                                      {item.label}
                                    </span>

                                    <span
                                      className="shrink-0 font-mono text-[11px] font-bold"
                                      style={{ color: textColor }}
                                    >
                                      {item.count}
                                    </span>

                                    <span
                                      className="w-10 shrink-0 text-right text-[9px] font-medium"
                                      style={{ color: mutedColor }}
                                    >
                                      {item.percentage.toFixed(1)}%
                                    </span>
                                  </div>

                                  <div
                                    className="ml-6 mt-2 h-2 overflow-hidden rounded-full"
                                    style={{ background: trackColor }}
                                  >
                                    <div
                                      className="h-full rounded-full transition-all duration-500 ease-out"
                                      style={{
                                        width: `${width}%`,
                                        background: color,
                                        boxShadow: `0 2px 8px ${color}35`,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {totalPages > 1 ? (
                  <div className="mt-5 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      disabled={safePage === 1}
                      onClick={() =>
                        setRequesterPage((page) => Math.max(1, page - 1))
                      }
                      className="rounded-md border px-3 py-1.5 text-[10px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        color: textColor,
                        borderColor: isDark
                          ? "rgba(148,163,184,.2)"
                          : "rgba(20,27,51,.1)",
                      }}
                    >
                      ←
                    </button>

                    <div
                      className="text-[10px] font-medium"
                      style={{ color: mutedColor }}
                    >
                      {safePage} / {totalPages}
                    </div>

                    <button
                      type="button"
                      disabled={safePage === totalPages}
                      onClick={() =>
                        setRequesterPage((page) =>
                          Math.min(totalPages, page + 1)
                        )
                      }
                      className="rounded-md border px-3 py-1.5 text-[10px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        color: textColor,
                        borderColor: isDark
                          ? "rgba(148,163,184,.2)"
                          : "rgba(20,27,51,.1)",
                      }}
                    >
                      →
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>        </div>
      </div>
    );
  };

  return (
    <ChartCard
      title={title}
      expandedContent={renderChart(expandedData, false)}
    >
      {renderChart(compactData, true)}
    </ChartCard>
  );
}
