"use client";

import { useMemo } from "react";

import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartColors } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

import { ChartCard } from "./ChartCard";

type ChartPoint = {
  date: string;
  current: number;
  previous: number;
};

export function TicketTrendCard({
  title,
  chartData,
  colors,
  theme,
  lang,
  activeFilter,
}: {
  title: string;
  chartData: ChartPoint[];
  colors: ChartColors;
  theme: string;
  lang: Lang;
  activeFilter: "week" | "month" | "year" | null;
}) {
  const { t } = useLang();

  const isDark = theme === "dark";

  const textColor = isDark ? "#F8FAFC" : "#141B33";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const gridColor = isDark ? "#334155" : "#CBD5E1";

  /* ============================================================
     TOTALS
  ============================================================ */

  const currentTotal = useMemo(
    () =>
      chartData.reduce(
        (sum, item) => sum + Number(item.current ?? 0),
        0
      ),
    [chartData]
  );

  const previousTotal = useMemo(
    () =>
      chartData.reduce(
        (sum, item) => sum + Number(item.previous ?? 0),
        0
      ),
    [chartData]
  );

  const changeCount = currentTotal - previousTotal;

  const changePercent =
    previousTotal > 0
      ? ((changeCount / previousTotal) * 100)
      : 0;

  const trendType =
    changePercent > 0
      ? "increase"
      : changePercent < 0
        ? "decrease"
        : "neutral";

  /* ============================================================
     PEAK
  ============================================================ */

  const peak = useMemo(() => {
    if (!chartData.length) return null;

    return chartData.reduce((highest, item) => {
      return Number(item.current ?? 0) >
        Number(highest.current ?? 0)
        ? item
        : highest;
    });
  }, [chartData]);

  /* ============================================================
     DATE FORMAT
  ============================================================ */

  const formatDateLabel = (value: string) => {
    if (/^\d{4}-\d{2}$/.test(value)) {
      const [year, month] = value.split("-");

      return new Date(
        Number(year),
        Number(month) - 1
      ).toLocaleDateString(
        lang === "cn" ? "zh-CN" : "en-US",
        {
          month: "short",
        }
      );
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    if (lang === "cn") {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  /* ============================================================
     TOOLTIP PERIOD LABEL
  ============================================================ */

  const getPeriodLabels = (value: string) => {
    if (activeFilter === "week") {
      return {
        current: t.itsmAnalysis.thisWeek,
        previous: t.itsmAnalysis.lastWeek,
      };
    }

    if (activeFilter === "month") {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return {
          current: t.itsmAnalysis.currentPeriod,
          previous: t.itsmAnalysis.previousPeriod,
        };
      }

      const previousDate = new Date(date);

      previousDate.setMonth(
        previousDate.getMonth() - 1
      );

      return {
        current: date.toLocaleDateString(
          lang === "cn" ? "zh-CN" : "en-US",
          {
            month: "long",
          }
        ),
        previous: previousDate.toLocaleDateString(
          lang === "cn" ? "zh-CN" : "en-US",
          {
            month: "long",
          }
        ),
      };
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return {
        current: t.itsmAnalysis.currentPeriod,
        previous: t.itsmAnalysis.previousPeriod,
      };
    }

    return {
      current: String(date.getFullYear()),
      previous: String(date.getFullYear() - 1),
    };
  };

  /* ============================================================
     EMPTY STATE
  ============================================================ */

  if (!chartData.length) {
    return (
      <ChartCard title={title}>
        <div
          className="flex h-[320px] items-center justify-center text-sm"
          style={{ color: mutedColor }}
        >
          {t.itsmAnalysis.noData}
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title}>
      <div className="w-full">
        {/* ======================================================
            HEADER
        ======================================================= */}
        <div className="mb-2 flex items-start justify-between gap-4">
          {/* LEFT */}
          <div>
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono text-2xl font-bold leading-none"
                style={{ color: textColor }}
              >
                {currentTotal}
              </span>

              <span
                className="text-[11px] font-semibold"
                style={{ color: mutedColor }}
              >
                {t.itsmAnalysis.tickets}
              </span>
            </div>

            <div
              className="mt-1 text-[10px] font-medium"
              style={{ color: mutedColor }}
            >
              {t.itsmAnalysis.currentPeriod}
            </div>
          </div>

          {/* RIGHT */}
          <div className="text-right">
            <div
              className="inline-flex items-center rounded-full px-3 py-1"
              style={{
                background:
                  trendType === "increase"
                    ? "rgba(16,185,129,0.10)"
                    : trendType === "decrease"
                      ? "rgba(239,68,68,0.10)"
                      : "rgba(148,163,184,0.10)",
                color:
                  trendType === "increase"
                    ? "#059669"
                    : trendType === "decrease"
                      ? "#DC2626"
                      : mutedColor,
              }}
            >
              <span className="text-[11px] font-bold">
                {trendType === "increase"
                  ? "↑"
                  : trendType === "decrease"
                    ? "↓"
                    : "→"}{" "}
                {Math.abs(changePercent).toFixed(1)}%
              </span>
            </div>

            <div
              className="mt-1 text-[10px] font-medium"
              style={{ color: mutedColor }}
            >
              {trendType === "increase"
                ? t.itsmAnalysis.increased
                : trendType === "decrease"
                  ? t.itsmAnalysis.decreased
                  : t.itsmAnalysis.noChange}
            </div>
          </div>
        </div>

        {/* ======================================================
            CHART
        ======================================================= */}
        <div className="w-full">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{
                top: 28,
                right: 16,
                left: 0,
                bottom: 10,
              }}
            >
              {/* GRADIENT */}
              <defs>
                <linearGradient
                  id="ticketTrendGradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop
                    offset="0%"
                    stopColor="#25EBB3"
                  />
                  <stop
                    offset="50%"
                    stopColor="#3B82F6"
                  />
                  <stop
                    offset="100%"
                    stopColor="#CD7364"
                  />
                </linearGradient>
              </defs>

              {/* GRID */}
              <CartesianGrid
                vertical={false}
                stroke={gridColor}
                strokeWidth={0.8}
                strokeOpacity={
                  isDark ? 0.4 : 0.65
                }
                strokeDasharray="5 5"
              />

              {/* X AXIS */}
              <XAxis
                dataKey="date"
                stroke={colors.axis}
                tickLine={false}
                axisLine={{
                  stroke: isDark
                    ? "#64748B"
                    : "#94A3B8",
                }}
                tick={{
                  fill: isDark
                    ? "#FFFFFF"
                    : "#475569",
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily:
                    "'JetBrains Mono', monospace",
                }}
                tickFormatter={formatDateLabel}
              />

              {/* Y AXIS */}
              <YAxis
                allowDecimals={false}
                stroke={colors.axis}
                tickLine={false}
                axisLine={{
                  stroke: isDark
                    ? "#64748B"
                    : "#94A3B8",
                }}
                tickMargin={10}
                tick={{
                  fill: isDark
                    ? "#FFFFFF"
                    : "#475569",
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily:
                    "'JetBrains Mono', monospace",
                }}
              />

              {/* ==================================================
                  LEGEND
              =================================================== */}
              <Legend
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{
                  paddingTop: 8,
                  fontSize: 11,
                  fontWeight: 600,
                }}
                formatter={(value) => (
                  <span
                    style={{
                      color: isDark
                        ? "#CBD5E1"
                        : "#475569",
                    }}
                  >
                    {value === "current"
                      ? t.itsmAnalysis.currentPeriod
                      : t.itsmAnalysis.previousPeriod}
                  </span>
                )}
              />

              {/* ==================================================
                  TOOLTIP
              =================================================== */}
              <Tooltip
                cursor={{
                  stroke: isDark
                    ? "#475569"
                    : "#CBD5E1",
                  strokeWidth: 1,
                }}
                content={({
                  active,
                  payload,
                  label,
                }) => {
                  if (
                    !active ||
                    !payload?.length
                  ) {
                    return null;
                  }

                  const current = Number(
                    payload.find(
                      (item) =>
                        item.dataKey === "current"
                    )?.value ?? 0
                  );

                  const previous = Number(
                    payload.find(
                      (item) =>
                        item.dataKey === "previous"
                    )?.value ?? 0
                  );

                  const difference =
                    current - previous;

                  const percentage =
                    previous > 0
                      ? (
                          (difference /
                            previous) *
                          100
                        ).toFixed(1)
                      : "0.0";

                  const periodLabels =
                    getPeriodLabels(
                      String(label)
                    );

                  return (
                    <div
                      style={{
                        minWidth: 190,
                        background: isDark
                          ? "#0F172A"
                          : "#FFFFFF",
                        color: textColor,
                        border: `1px solid ${
                          isDark
                            ? "#334155"
                            : "#E2E8F0"
                        }`,
                        borderRadius: 12,
                        padding:
                          "12px 14px",
                        boxShadow:
                          "0 10px 30px rgba(15,23,42,0.16)",
                      }}
                    >
                      {/* DATE */}
                      <div
                        style={{
                          marginBottom: 10,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {formatDateLabel(
                          String(label)
                        )}
                      </div>

                      {/* CURRENT */}
                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          marginBottom: 6,
                          fontSize: 11,
                        }}
                      >
                        <span
                          style={{
                            color: "#3B82F6",
                            fontWeight: 600,
                          }}
                        >
                          {
                            t.itsmAnalysis
                              .currentPeriod
                          }{" "}
                          (
                          {
                            periodLabels.current
                          }
                          )
                        </span>

                        <strong
                          style={{
                            color: textColor,
                            fontFamily:
                              "'JetBrains Mono', monospace",
                          }}
                        >
                          {current}
                        </strong>
                      </div>

                      {/* PREVIOUS */}
                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          marginBottom: 10,
                          fontSize: 11,
                        }}
                      >
                        <span
                          style={{
                            color: "#94A3B8",
                            fontWeight: 600,
                          }}
                        >
                          {
                            t.itsmAnalysis
                              .previousPeriod
                          }{" "}
                          (
                          {
                            periodLabels.previous
                          }
                          )
                        </span>

                        <strong
                          style={{
                            color: textColor,
                            fontFamily:
                              "'JetBrains Mono', monospace",
                          }}
                        >
                          {previous}
                        </strong>
                      </div>

                      {/* CHANGE */}
                      <div
                        style={{
                          borderTop: `1px solid ${
                            isDark
                              ? "#334155"
                              : "#E2E8F0"
                          }`,
                          paddingTop: 8,
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          fontSize: 11,
                        }}
                      >
                        <span
                          style={{
                            color: mutedColor,
                            fontWeight: 500,
                          }}
                        >
                          {t.itsmAnalysis.change}
                        </span>

                        <strong
                          style={{
                            color:
                              difference > 0
                                ? "#10B981"
                                : difference <
                                    0
                                  ? "#EF4444"
                                  : mutedColor,
                            fontFamily:
                              "'JetBrains Mono', monospace",
                          }}
                        >
                          {difference > 0
                            ? "+"
                            : ""}
                          {difference}{" "}
                          ({percentage}%)
                        </strong>
                      </div>
                    </div>
                  );
                }}
              />

              {/* ==================================================
                  PREVIOUS PERIOD
              =================================================== */}
              <Line
                type="natural"
                dataKey="previous"
                name="previous"
                stroke="#CBD5E1"
                strokeWidth={2.5}
                animationDuration={1000}
                animationEasing="ease-in-out"
                dot={{
                  r: 3.5,
                  fill: "#CBD5E1",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 5,
                  fill: "#94A3B8",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
              >
                <LabelList
                  dataKey="previous"
                  position="top"
                  offset={8}
                  style={{
                    fontFamily:
                      "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 600,
                    fill: isDark
                      ? "#CBD5E1"
                      : "#64748B",
                  }}
                />
              </Line>

              {/* ==================================================
                  CURRENT PERIOD
              =================================================== */}
              <Line
                type="natural"
                dataKey="current"
                name="current"
                stroke="url(#ticketTrendGradient)"
                strokeWidth={3.5}
                animationDuration={1200}
                animationEasing="ease-in-out"
                dot={{
                  r: 4.5,
                  fill: "#2563EB",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: "#2563EB",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
              >
                <LabelList
                  dataKey="current"
                  position="top"
                  offset={8}
                  style={{
                    fontFamily:
                      "'JetBrains Mono', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    fill: isDark
                      ? "#F8FAFC"
                      : "#334155",
                  }}
                />
              </Line>

              {/* ==================================================
                  PEAK MARKER
              =================================================== */}
              {peak && (
                <ReferenceDot
                  x={peak.date}
                  y={peak.current}
                  r={5}
                  fill="#F59E0B"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ======================================================
            FOOTER SUMMARY
        ======================================================= */}
        <div className="mt-1 flex items-center justify-between px-1">
          <div
            className="text-[11px] font-medium"
            style={{ color: mutedColor }}
          >
            {t.itsmAnalysis.peak}:{" "}
            <strong style={{ color: textColor }}>
              {peak?.current ?? 0}
            </strong>
          </div>

          <div
            className="text-[11px] font-medium"
            style={{ color: mutedColor }}
          >
            {t.itsmAnalysis.change}:{" "}
            <strong
              style={{
                color:
                  changeCount > 0
                    ? "#10B981"
                    : changeCount < 0
                      ? "#EF4444"
                      : textColor,
                fontFamily:
                  "'JetBrains Mono', monospace",
              }}
            >
              {changeCount > 0 ? "+" : ""}
              {changeCount}
            </strong>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}