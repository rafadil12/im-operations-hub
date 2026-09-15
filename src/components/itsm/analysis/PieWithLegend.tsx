"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useChartColors, type Slice } from "./itsmChartUtils";

type Technician = {
  name: string;
  count?: number;
  incidentCount?: number;
  requestCount?: number;
};

type Props = {
  slices: Slice[];
  technicians?: Technician[];
  chartHeight?: number;
  legendMaxHeight?: number;
};

export function PieWithLegend({
  slices,
  technicians = [],
  chartHeight = 280,
  legendMaxHeight = 320,
}: Props) {
  const { theme } = useTheme();
  const { t, lang } = useLang();
  const colors = useChartColors();

  const isDark = theme === "dark";

  const textColor = isDark ? "#F8FAFC" : "#141B33";
  const mutedColor = isDark ? "#94A3B8" : "#5B6478";

  /*
   * ============================================================
   * REQUEST TYPE DATA
   * ============================================================
   */

  const total = slices.reduce((sum, item) => sum + item.value, 0);

  const requestData = [...slices]
    .filter((item) => item && item.value > 0)
    .map((item) => ({
      ...item,
      percent:
        total > 0
          ? Number(((item.value / total) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.value - a.value);

  /*
   * ============================================================
   * TECHNICIAN DATA
   * ============================================================
   */

  const technicianData = [...technicians]
    .filter((item) => item && item.name)
    .map((item) => ({
      name: item.name,
      totalCount: Number(item.count ?? 0),
      incidentCount: Number(item.incidentCount ?? 0),
      requestCount: Number(item.requestCount ?? 0),
      hasSplitCount:
        item.incidentCount !== undefined || item.requestCount !== undefined,
    }))
    .sort((a, b) => {
      const aTotal = a.hasSplitCount
        ? a.incidentCount + a.requestCount
        : a.totalCount;
      const bTotal = b.hasSplitCount
        ? b.incidentCount + b.requestCount
        : b.totalCount;
      return bTotal - aTotal;
    })
    .slice(0, 8);

  const maxTechnicianCount = Math.max(
    1,
    ...technicianData.map((item) =>
      item.hasSplitCount
        ? item.incidentCount + item.requestCount
        : item.totalCount
    )
  );

  const hasTechnicianSplit = technicianData.some((item) => item.hasSplitCount);

  return (
    <div
      className="w-full"
    >
      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="mb-5 flex items-end justify-between">
        <div>
          <p
            className="text-[13px] font-bold"
            style={{ color: textColor }}
          >
            {t.itsmAnalysis.requestType}
          </p>

          <p
            className="mt-1 text-[11px]"
            style={{ color: mutedColor }}
          >
            {t.itsmAnalysis.technicianWorkloadMix}
          </p>
        </div>

        <div className="text-right">
          <p
            className="font-mono text-lg font-bold"
            style={{ color: textColor }}
          >
            {total}
          </p>

          <p
            className="text-[9px]"
            style={{ color: mutedColor }}
          >
            {t.itsmAnalysis.tickets}
          </p>
        </div>
      </div>

      {/* ======================================================
          COMBINATION
          LEFT  = TECHNICIAN
          RIGHT = REQUEST TYPE
          ====================================================== */}

      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.85fr]">
        {/* ====================================================
            LEFT : TECHNICIAN
            ==================================================== */}

        <div className="min-w-0">
          <div className="mb-3">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: mutedColor }}
            >
              {t.itsmAnalysis.technicians}
            </p>

            <p
              className="mt-1 text-[10px]"
              style={{ color: mutedColor }}
            >
              {t.itsmAnalysis.techniciansByVolume}
            </p>
          </div>

          {technicianData.length > 0 ? (
            <div
              className="w-full"
              style={{
                height: Math.max(chartHeight, 230),
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={technicianData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 34,
                    left: 0,
                    bottom: 5,
                  }}
                  barCategoryGap="24%"
                >
                  <XAxis
                    type="number"
                    domain={[0, maxTechnicianCount]}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      fill: mutedColor,
                      fontWeight: 800,
                    }}
                  />

                  <Tooltip
                    formatter={(value, name) => {
                      if (!hasTechnicianSplit) {
                        return [value, lang === "cn" ? "Tickets" : "Tickets"];
                      }

                      const label =
                        name === "incidentCount"
                         ? t.itsmAnalysis.incident
                         : t.itsmAnalysis.request;

                      return [value, label];
                    }}
                    contentStyle={{
                      fontSize: 10,
                      borderRadius: 8,
                    }}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={92}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontFamily: "'Noto Sans SC', sans-serif",
                      fontSize: 10,
                      fontWeight: 500,
                      fill: textColor,
                    }}
                  />

                  {hasTechnicianSplit ? (
                    <>
                      <Legend
                        verticalAlign="top"
                        align="right"
                        height={24}
                        iconType="circle"
                        wrapperStyle={{
                          fontSize: 10,
                          color: mutedColor,
                          fontFamily: "'Noto Sans SC', sans-serif",
                        }}
                        formatter={(value) =>
                          value === "incidentCount" ? t.itsmAnalysis.incident : t.itsmAnalysis.request
                        }
                      />

                      <Bar
                        dataKey="incidentCount"
                        name="incidentCount"
                        stackId="requestType"
                        fill="#3B5BDB"
                        barSize={18}
                        radius={[6, 0, 0, 6]}
                        animationDuration={500}
                      >
                        <LabelList
                          dataKey="incidentCount"
                          position="inside"
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9,
                            fontWeight: 600,
                            fill: "#FFFFFF",
                          }}
                          formatter={(value: unknown) =>
                            Number(value) > 0 ? String(value) : ""
                          }
                        />
                      </Bar>

                      <Bar
                        dataKey="requestCount"
                        name="requestCount"
                        stackId="requestType"
                        fill="#10B981"
                        barSize={18}
                        radius={[0, 6, 6, 0]}
                        animationDuration={500}
                      >
                        <LabelList
                          dataKey="requestCount"
                          position="inside"
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9,
                            fontWeight: 600,
                            fill: "#FFFFFF",
                          }}
                          formatter={(value: unknown) =>
                            Number(value) > 0 ? String(value) : ""
                          }
                        />
                      </Bar>
                    </>
                  ) : (
                    <Bar
                      dataKey="totalCount"
                      name="totalCount"
                      fill="#3B5BDB"
                      barSize={18}
                      radius={[0, 6, 6, 0]}
                      animationDuration={500}
                    >
                      <LabelList
                        dataKey="totalCount"
                        position="right"
                        offset={7}
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                          fontWeight: 600,
                          fill: mutedColor,
                        }}
                      />
                    </Bar>
                  )}

                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              className="flex h-[230px] items-center justify-center text-xs"
              style={{ color: mutedColor }}
            >
              {t.itsmAnalysis.noData}
            </div>
          )}
        </div>

        {/* ====================================================
            RIGHT : REQUEST TYPE
            ==================================================== */}

        <div className="min-w-0 border-t border-black/[0.06] pt-5 dark:border-white/[0.08] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="mb-2">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: mutedColor }}
            >
              {t.itsmAnalysis.requestType}
            </p>

            <p
              className="mt-1 text-[10px]"
              style={{ color: mutedColor }}
            >
              {t.itsmAnalysis.serviceIncidentDistribution}
            </p>
          </div>

          {/* DONUT */}

          <div className="relative h-[180px] w-full">
            {requestData.length > 0 ? (
              <>
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={requestData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      stroke="none"
                      animationDuration={500}
                    >
                      {requestData.map((item, index) => (
                        <Cell
                          key={`${item.label}-${index}`}
                          fill={item.color}
                        />
                      ))}
                    </Pie>

                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                {/* CENTER VALUE */}

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p
                      className="font-mono text-2xl font-bold"
                      style={{ color: textColor }}
                    >
                      {total}
                    </p>

                    <p
                      className="text-[9px]"
                      style={{ color: mutedColor }}
                    >
                      {t.itsmAnalysis.tickets}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div
                className="flex h-full items-center justify-center text-xs"
                style={{ color: mutedColor }}
              >
                {t.itsmAnalysis.noData}
              </div>
            )}
          </div>

          {/* REQUEST TYPE LEGEND */}

          <div className="mt-2 space-y-2.5">
            {requestData.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="grid grid-cols-[9px_minmax(0,1fr)_35px_45px] items-center gap-2"
              >
                {/* COLOR */}

                <span
                  className="h-2 w-2 rounded-sm"
                  style={{
                    background: item.color,
                  }}
                />

                {/* LABEL */}

                <span
                  className="truncate text-[10px] font-medium"
                  style={{
                    color: textColor,
                  }}
                  title={item.label}
                >
                  {item.label}
                </span>

                {/* VALUE */}

                <span
                  className="text-right font-mono text-[10px] font-semibold"
                  style={{
                    color: textColor,
                  }}
                >
                  {item.value}
                </span>

                {/* PERCENT */}

                <span
                  className="text-right font-mono text-[10px]"
                  style={{
                    color: mutedColor,
                  }}
                >
                  {item.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}